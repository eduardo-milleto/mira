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

function buildPrompt(input: InsightsRequest, currentYear: number): string {
  const horizon = input.horizonYears;
  const endYear = currentYear + horizon - 1;
  const returnRate =
    input.returnRatePct !== undefined
      ? `${input.returnRatePct}% ao ano`
      : "uma taxa de mercado realista que voce assumir";

  return [
    "Voce e um consultor financeiro. Analise os dados mensais de um usuario brasileiro e responda em portugues do Brasil, de forma pratica e realista. NUNCA de conselhos genericos.",
    "",
    `Renda mensal: R$ ${input.monthlyIncome}`,
    `Gastos mensais: R$ ${input.monthlyExpenses}`,
    `Patrimonio atual: R$ ${input.netWorth}`,
    "",
    "Gastos por categoria:",
    formatBreakdown(input.spendingBreakdown),
    "",
    "Patrimonio por categoria:",
    formatBreakdown(input.assetBreakdown),
    "",
    "Fontes de renda (com premissa de crescimento e rendas futuras):",
    formatIncomes(input.incomeSources, currentYear),
    "",
    "Investimentos (premissa de rendimento por ativo):",
    formatInvestments(input.investments),
    "",
    "Premissas da projecao:",
    `- Horizonte: ${horizon} anos (de ${currentYear} a ${endYear}).`,
    `- Taxa de rendimento da sobra investida: ${returnRate}.`,
    "",
    "Calcule:",
    "1. healthScore (0 a 100): considere a taxa de poupanca ((renda - gastos) / renda), a relacao gastos/renda e o folego do patrimonio (patrimonio dividido pelos gastos mensais, em meses). Mais sobra e mais folego = score maior.",
    "2. status: rotulo curto (ex: 'Critica', 'Atencao', 'Boa', 'Muito boa', 'Excelente').",
    "3. insight: uma unica frase curta de recomendacao pratica.",
    "4. steps: exatamente 4 marcos de evolucao [{label, percent, status}]. O primeiro deve ser 'Hoje' com percent = healthScore; os outros 3 sao metas crescentes ate 'Liberdade financeira' com percent 100.",
    `5. projection: patrimonio projetado para ${horizon} anos [{year, value}], um ponto por ano de ${currentYear} a ${endYear}. O patrimonio inicial JA E a soma dos investimentos listados acima; faca CADA ativo crescer pela sua taxa esperada (ou, quando ausente, uma taxa realista que voce inferir pela categoria/notes do ativo). A sobra mensal (renda - gastos) e um APORTE NOVO que entra ao longo dos anos e rende a ${returnRate}. Some o rendimento do estoque de ativos com os aportes novos — eles se SOMAM, NUNCA se sobrepoem (nao conte a sobra investida duas vezes). Faca tambem cada fonte de renda crescer pelo seu percentual ao ano e some as rendas futuras a partir do ano de inicio delas. Quando uma renda tiver "valores definidos" para anos especificos, use exatamente esse valor naquele ano em diante (ele sobrescreve o crescimento percentual ate o proximo valor definido; depois volta a crescer pelo percentual).`,
    "6. projectionExplanation: explique em detalhe (2 a 4 frases) como essa projecao foi calculada — as premissas (rendimento de cada investimento, crescimento de cada renda, rendas futuras, sobra mensal investida, taxa de rendimento), o que mais influencia o resultado e o que o usuario pode fazer pra melhorar a curva.",
    "7. recommendations: de 3 a 5 recomendacoes praticas e ESPECIFICAS, citando as categorias reais de gasto/patrimonio/renda listadas acima (ex: renegociar/cortar uma categoria especifica de gasto, acelerar uma renda futura, realocar um ativo concreto). Cada uma com: title (curto), description (acao concreta e o porque, com numeros quando possivel), priority ('alta', 'media' ou 'baixa'). Nada generico.",
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
