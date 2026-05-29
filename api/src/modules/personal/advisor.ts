import { z } from "zod";
import { type AdvisorContext, formatContext } from "./context.js";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 45000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

// --- chat da consultora ---
const chatResponseSchema = z.object({
  reply: z.string().min(1),
  // veredito so faz sentido quando a pergunta e sobre uma compra; nos outros casos vem "neutro"
  verdict: z.enum(["pode", "cuidado", "evite", "neutro"]),
});
export type AdvisorReply = z.infer<typeof chatResponseSchema>;

const chatGeminiSchema = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    verdict: { type: "STRING", enum: ["pode", "cuidado", "evite", "neutro"] },
  },
  propertyOrdering: ["reply", "verdict"],
};

// --- sugestao de limites ---
const limitSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        category: z.string().min(1),
        amount: z.number().nonnegative(),
        reason: z.string().min(1),
      }),
    )
    .min(1),
});
export type LimitSuggestions = z.infer<typeof limitSuggestionsSchema>;

const limitsGeminiSchema = {
  type: "OBJECT",
  properties: {
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" },
          amount: { type: "NUMBER" },
          reason: { type: "STRING" },
        },
        propertyOrdering: ["category", "amount", "reason"],
      },
    },
  },
  propertyOrdering: ["suggestions"],
};

// chamada generica ao Gemini com saida JSON forcada + validacao defensiva (igual padrao do insights).
// NUNCA logamos o prompt nem o conteudo (tem dado financeiro e mensagem do usuario).
async function callGemini<T>(
  apiKey: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? "desconhecido";
      throw new Error(`Gemini sem conteudo (finishReason=${reason})`);
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Gemini retornou JSON invalido");
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(`Gemini fora do schema: ${JSON.stringify(result.error.issues)}`);
    }
    return result.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini timeout apos ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const PERSONA = [
  "Voce e a Mira, consultora financeira pessoal do usuario. Voce tem acesso total aos dados financeiros dele (renda, gastos fixos, gastos pessoais do mes, limites, patrimonio, investimentos, fontes de renda e premissas de projecao), listados abaixo.",
  "Responda sempre em portugues do Brasil, num tom direto, humano e honesto — como uma amiga que entende de dinheiro. Nada de conselho generico.",
  "Quando o usuario perguntar se pode comprar algo, avalie com NUMEROS reais: quanto sobra no mes, como fica o limite da categoria, o impacto na sobra investida e na projecao de longo prazo, e leve em conta os gatilhos/padroes de consumo dele (use os gatilhos que ele descreveu e tambem o que voce inferir do historico de compras).",
  "Seja pratica: se der pra comprar, diga; se for apertado, mostre o trade-off; se for furada, explique o porque e ofereca uma alternativa concreta.",
].join(" ");

// roda um turno do chat da consultora. recebe o contexto financeiro, o historico recente
// e a nova mensagem; devolve a resposta (texto + veredito) ja validada.
export async function runAdvisorChat(
  ctx: AdvisorContext,
  history: ChatTurn[],
  message: string,
  apiKey: string,
): Promise<AdvisorReply> {
  const systemInstruction = [
    PERSONA,
    "",
    "Dados financeiros atuais do usuario:",
    formatContext(ctx),
    "",
    "Responda em JSON com: reply (sua resposta conversacional pro usuario) e verdict ('pode', 'cuidado' ou 'evite' quando a pergunta for sobre uma compra; 'neutro' quando nao for uma decisao de compra).",
  ].join("\n");

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  return callGemini(
    apiKey,
    {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: chatGeminiSchema,
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    chatResponseSchema,
  );
}

// pede pra IA sugerir um limite mensal saudavel por categoria de gasto pessoal.
// devolve as sugestoes (sem persistir — quem salva e o usuario).
export async function suggestLimits(ctx: AdvisorContext, apiKey: string): Promise<LimitSuggestions> {
  const prompt = [
    PERSONA,
    "",
    "Dados financeiros atuais do usuario:",
    formatContext(ctx),
    "",
    "Sugira um limite mensal saudavel para cada categoria de gasto pessoal que aparece no historico/limites acima (se nao houver nenhuma ainda, sugira categorias comuns como Lazer, Delivery e Compras).",
    "Baseie-se na sobra real do mes e no padrao de consumo. Para cada categoria devolva: category, amount (teto mensal em reais, numero) e reason (1 frase curta explicando).",
  ].join("\n");

  return callGemini(
    apiKey,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: limitsGeminiSchema,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    limitSuggestionsSchema,
  );
}
