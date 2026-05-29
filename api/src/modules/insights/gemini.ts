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
    projection5y: {
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
  },
  propertyOrdering: ["healthScore", "status", "insight", "steps", "projection5y"],
};

function buildPrompt(input: InsightsRequest, currentYear: number): string {
  return [
    "Voce e um analista financeiro. Analise os dados mensais de um usuario brasileiro e responda em portugues do Brasil.",
    "",
    `Renda mensal: R$ ${input.monthlyIncome}`,
    `Gastos mensais: R$ ${input.monthlyExpenses}`,
    `Patrimonio atual: R$ ${input.netWorth}`,
    "",
    "Calcule:",
    "1. healthScore (0 a 100): considere a taxa de poupanca ((renda - gastos) / renda), a relacao gastos/renda e o folego do patrimonio (patrimonio dividido pelos gastos mensais, em meses). Mais sobra e mais folego = score maior.",
    "2. status: rotulo curto (ex: 'Critica', 'Atencao', 'Boa', 'Muito boa', 'Excelente').",
    "3. insight: uma unica frase curta de recomendacao pratica.",
    "4. steps: exatamente 4 marcos de evolucao [{label, percent, status}]. O primeiro deve ser 'Hoje' com percent = healthScore; os outros 3 sao metas crescentes ate 'Liberdade financeira' com percent 100.",
    `5. projection5y: patrimonio projetado para os proximos 5 anos [{year, value}], comecando em ${currentYear}, assumindo que a sobra mensal (renda - gastos) e investida e rende ao longo do tempo.`,
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
