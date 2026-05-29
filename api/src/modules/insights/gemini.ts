import { insightsResponseSchema, type InsightsRequest, type InsightsResponse } from "./insights.schemas.js";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 30000;

// schema no formato do Gemini (subset do OpenAPI) pra forcar saida JSON estruturada
const responseSchema = {
  type: "OBJECT",
  properties: {
    healthScore: { type: "NUMBER" },
    status: { type: "STRING" },
    insight: { type: "STRING" },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          percent: { type: "NUMBER" },
          status: { type: "STRING" },
        },
        propertyOrdering: ["label", "percent", "status"],
      },
    },
    projection: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          year: { type: "STRING" },
          value: { type: "NUMBER" },
        },
        propertyOrdering: ["year", "value"],
      },
    },
    projectionExplanation: { type: "STRING" },
    recommendations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          priority: { type: "STRING" },
        },
        propertyOrdering: ["title", "description", "priority"],
      },
    },
  },
  propertyOrdering: [
    "healthScore",
    "status",
    "insight",
    "steps",
    "projection",
    "projectionExplanation",
    "recommendations",
  ],
};

function formatBreakdown(items: { name: string; value: number }[]): string {
  if (!items.length) return "(nao informado)";
  return items.map((i) => `- ${i.name}: R$ ${i.value}`).join("\n");
}

// descreve cada fonte de renda: premissa de crescimento, ano de inicio (se futura)
// e os valores definidos pra anos especificos (que sobrescrevem o crescimento naquele ano)
function formatIncomes(
  items: {
    name: string;
    monthlyAmount: number;
    annualGrowthPct: number;
    startYear?: number | null;
    steps?: { year: number; monthlyAmount: number }[];
  }[],
  currentYear: number,
): string {
  if (!items.length) return "(nao informado)";
  return items
    .map((i) => {
      const growth = `cresce ${i.annualGrowthPct}% ao ano`;
      const when =
        i.startYear && i.startYear > currentYear
          ? `, comeca em ${i.startYear} (renda futura)`
          : "";
      const steps = i.steps?.length
        ? `; valores definidos: ${i.steps
            .slice()
            .sort((a, b) => a.year - b.year)
            .map((s) => `em ${s.year} passa a R$ ${s.monthlyAmount}/mes`)
            .join(", ")}`
        : "";
      return `- ${i.name}: R$ ${i.monthlyAmount}/mes (${growth})${when}${steps}`;
    })
    .join("\n");
}

// descreve cada investimento com sua premissa de rendimento por ativo (ou taxa a inferir)
function formatInvestments(
  items: { name: string; category: string; value: number; expectedReturnPct?: number | null; notes?: string | null }[],
): string {
  if (!items.length) return "(nao informado)";
  return items
    .map((i) => {
      const rate =
        i.expectedReturnPct != null
          ? `rende ${i.expectedReturnPct}% ao ano`
          : "taxa a inferir pela categoria";
      const notes = i.notes ? ` — ${i.notes}` : "";
      return `- ${i.name} [${i.category}]: R$ ${i.value} (${rate})${notes}`;
    })
    .join("\n");
}

// descreve os fechamentos de mes: o que o app calculou vs o confirmado. a diferenca (com
// motivo) e o sinal de que entrou/saiu dinheiro fora do app — relevante pra IA entender
function formatMonthCloses(
  items: { month: string; computedSurplus: number; confirmedSurplus: number; reason?: string | null }[],
): string {
  if (!items.length) return "(nenhum)";
  return items
    .map((c) => {
      const diff = c.confirmedSurplus - c.computedSurplus;
      const tag =
        Math.abs(diff) < 0.005
          ? "bateu com o app"
          : `diferenca de R$ ${diff.toFixed(2)}${c.reason ? ` — motivo: ${c.reason}` : " (sem motivo informado)"}`;
      return `- ${c.month}: app calculou R$ ${c.computedSurplus}, confirmado R$ ${c.confirmedSurplus} (${tag})`;
    })
    .join("\n");
}

function buildPrompt(input: InsightsRequest, currentYear: number): string {
  const horizon = input.horizonYears;
  const endYear = currentYear + horizon - 1;

  return [
    "Voce e um consultor financeiro. Analise os dados mensais de um usuario brasileiro e responda em portugues do Brasil, de forma pratica e realista. NUNCA de conselhos genericos.",
    "",
    `Renda mensal: R$ ${input.monthlyIncome}`,
    `Gastos mensais: R$ ${input.monthlyExpenses}`,
    `Patrimonio atual (soma dos investimentos): R$ ${input.netWorth}`,
    `Saldo parado no cofre (sobra ainda NAO investida; caixa que nao rende): R$ ${input.cofreBalance}`,
    "",
    "Gastos por categoria:",
    formatBreakdown(input.spendingBreakdown),
    "",
    "Patrimonio por categoria:",
    formatBreakdown(input.assetBreakdown),
    "",
    "Fontes de renda (contexto pra saude financeira e recomendacoes):",
    formatIncomes(input.incomeSources, currentYear),
    "",
    "Investimentos (taxa = rentabilidade REALIZADA do historico quando existe; senao, a inferir):",
    formatInvestments(input.investments),
    "",
    "Fechamentos de mes (app calculou x usuario confirmou; a diferenca revela ganho/gasto FORA do app):",
    formatMonthCloses(input.monthCloses),
    "",
    "Premissas da projecao:",
    `- Horizonte: ${horizon} anos (de ${currentYear} a ${endYear}).`,
    "- A projecao e HONESTA: o usuario NAO reinveste a sobra automaticamente.",
    "",
    "Calcule:",
    "1. healthScore (0 a 100): considere a taxa de poupanca ((renda - gastos) / renda), a relacao gastos/renda, o folego do patrimonio (patrimonio dividido pelos gastos mensais, em meses) e a liquidez parada no cofre. Mais sobra e mais folego = score maior.",
    "2. status: rotulo curto (ex: 'Critica', 'Atencao', 'Boa', 'Muito boa', 'Excelente').",
    "3. insight: uma unica frase curta de recomendacao pratica.",
    "4. steps: exatamente 4 marcos de evolucao [{label, percent, status}]. O primeiro deve ser 'Hoje' com percent = healthScore; os outros 3 sao metas crescentes ate 'Liberdade financeira' com percent 100.",
    `5. projection: patrimonio projetado para ${horizon} anos [{year, value}], um ponto por ano de ${currentYear} a ${endYear}. O patrimonio inicial JA E a soma dos investimentos listados acima. Faca CADA ativo crescer SOMENTE pela sua taxa (a informada e a realizada do historico; quando ausente, infira uma taxa realista pela categoria/notes). NAO injete a sobra mensal nem o saldo do cofre como aporte automatico — o usuario NAO reinveste sozinho, entao esse dinheiro fica parado, nao entra na curva do patrimonio e nao rende. A projecao cresce APENAS pelo rendimento dos proprios ativos; se o usuario nao aportar, ela cresce devagar de proposito (retrato honesto de nao reinvestir).`,
    `6. projectionExplanation: explique (2 a 4 frases) que a curva cresce so pelo rendimento dos ativos (cite as taxas), que a sobra mensal NAO esta sendo reinvestida — fica parada no cofre (R$ ${input.cofreBalance}) sem render — e que pra acelerar o patrimonio o usuario precisa aportar esse dinheiro nos investimentos. Se os fechamentos de mes mostrarem diferencas, mencione o que isso revela (gasto/ganho fora do app).`,
    "7. recommendations: de 3 a 5 recomendacoes praticas e ESPECIFICAS, citando as categorias reais de gasto/patrimonio/renda. Se ha saldo parado no cofre, priorize recomendar aportar (quanto e em que tipo de ativo). Use os motivos dos fechamentos de mes pra apontar vazamentos fora do app. Cada uma com: title (curto), description (acao concreta e o porque, com numeros quando possivel), priority ('alta', 'media' ou 'baixa'). Nada generico.",
  ].join("\n");
}

// chama o Gemini e devolve o insight ja validado; lanca em qualquer falha
export async function generateInsights(
  input: InsightsRequest,
  apiKey: string,
): Promise<InsightsResponse> {
  const currentYear = new Date().getFullYear();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input, currentYear) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
          // desliga o "thinking" do 2.5-flash: pro nosso calculo estruturado nao precisa
          // de raciocinio e corta muita latencia (evita o timeout)
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 800)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: unknown;
    };

    // sem texto = conteudo bloqueado ou resposta vazia; loga finishReason + payload cru
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? "desconhecido";
      throw new Error(`Gemini sem conteudo (finishReason=${reason}): ${JSON.stringify(data).slice(0, 800)}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Gemini retornou JSON invalido: ${text.slice(0, 800)}`);
    }

    const result = insightsResponseSchema.safeParse(json);
    if (!result.success) {
      throw new Error(
        `Gemini fora do schema (${JSON.stringify(result.error.issues)}): ${text.slice(0, 800)}`,
      );
    }

    return result.data;
  } catch (err) {
    // deixa explicito quando foi timeout (o abort vira AbortError generico)
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini timeout apos ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
