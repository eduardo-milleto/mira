import { z } from "zod";
import { AREAS, areaSchema, type Area } from "./gastos.schemas.js";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 30000;

// schema no formato do Gemini (subset do OpenAPI): forca um array {name, area}, com area
// presa ao enum das areas fixas. mesmo assim a saida e revalidada/clampada depois.
const responseSchema = {
  type: "OBJECT",
  properties: {
    classifications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          area: { type: "STRING", enum: [...AREAS] },
        },
        propertyOrdering: ["name", "area"],
      },
    },
  },
  propertyOrdering: ["classifications"],
};

// valida o formato cru da resposta antes de clampar cada area
const rawOutputSchema = z.object({
  classifications: z.array(z.object({ name: z.string(), area: z.string() })),
});

function buildPrompt(names: string[]): string {
  return [
    "Voce classifica nomes de gastos mensais de um usuario brasileiro em UMA area de gasto.",
    "Responda em portugues do Brasil e use o contexto brasileiro pra decidir.",
    "",
    "Areas permitidas (escolha EXATAMENTE uma destas, escrita identica):",
    AREAS.map((a) => `- ${a}`).join("\n"),
    "",
    "Exemplos:",
    "- Aluguel, Condominio, IPTU, financiamento do imovel -> Moradia",
    "- Uber, 99, gasolina, posto, IPVA, seguro do carro, onibus -> Transporte",
    "- iFood, Mercado, Rappi, restaurante, padaria, feira -> Alimentação",
    "- Plano de saude, Unimed, farmacia, academia, dentista -> Saúde",
    "- Faculdade, curso, Alura, mensalidade escolar -> Educação",
    "- Netflix, Spotify, Claude, ChatGPT, Codex, Amazon Prime, iCloud -> Assinaturas e Serviços",
    "- Emprestimo, Consorcio, fatura de cartao, parcelamento, financiamento que nao seja de imovel -> Dívidas e Empréstimos",
    "- Aporte, Tesouro, previdencia, CDB, reserva -> Investimentos",
    "- Cinema, viagem, bar, show, jogos, hobby -> Lazer",
    "- Nome de banco ou cartao sem mais contexto (ex: Banrisul, Bradesco) -> Dívidas e Empréstimos",
    "- Quando nao der pra saber com seguranca -> Outros",
    "",
    "Classifique cada nome abaixo. Devolva um item por nome, com a area exatamente como na lista:",
    names.map((n) => `- ${n}`).join("\n"),
  ].join("\n");
}

// chama o Gemini e devolve { nome -> area } pra TODOS os nomes pedidos. nomes que o
// modelo deixou de fora ou classificou numa area invalida caem em "Outros" (nunca
// confiamos que o array veio completo/ordenado: casamos por nome). lanca se a chamada falhar.
export async function classifyAreas(
  names: string[],
  apiKey: string,
): Promise<Record<string, Area>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(names) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
          // classificacao nao precisa de raciocinio; desligar o thinking corta latencia
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
    };

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

    const parsed = rawOutputSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Gemini fora do schema: ${text.slice(0, 800)}`);
    }

    // indexa a resposta por nome e clampa a area; depois garante uma entrada por nome pedido
    const byName = new Map<string, Area>();
    for (const c of parsed.data.classifications) {
      const area = areaSchema.safeParse(c.area).success ? (c.area as Area) : "Outros";
      byName.set(c.name, area);
    }

    const result: Record<string, Area> = {};
    for (const name of names) {
      result[name] = byName.get(name) ?? "Outros";
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini timeout apos ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
