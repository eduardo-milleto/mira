import { executeTool, toolDeclarations } from "./tools.js";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent`;
// teto de rodadas do loop (cada rodada = 1 chamada ao Gemini). na ultima forcamos resposta
// em texto (mode NONE) pra sempre terminar com algo pro usuario, nunca em looping de tools.
const MAX_ITERATIONS = 6;
// guarda de tempo do loop inteiro (varias rodadas): aborta tudo se passar disso
const OVERALL_TIMEOUT_MS = 90_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

// eventos que o loop emite pra rota transmitir via SSE pro frontend
export type AssistantEvent =
  | { type: "token"; text: string } // pedaco de texto da resposta final
  | { type: "tool"; name: string } // a IA comecou a consultar uma ferramenta
  | { type: "verdict"; value: "pode" | "cuidado" | "evite" } // parecer da avaliacao de compra
  | { type: "reset" }; // descarta o texto parcial ja exibido (era so preambulo antes de uma tool)

// estrutura minima de um part vindo do Gemini
type GeminiPart = {
  text?: string;
  thought?: boolean; // parte de "raciocinio" (thinking) — NUNCA mostrar ao usuario
  thoughtSignature?: string; // assinatura do raciocinio: deve voltar verbatim nas proximas rodadas
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
};
type GeminiContent = { role?: string; parts?: GeminiPart[] };

const PERSONA = [
  "Você é a Mira, a consultora financeira pessoal do usuário dentro do app Mira. Aja como uma consultora de verdade: toma posição, recomenda, não foge da pergunta.",
  "Você NÃO sabe nada sobre as finanças dele de cabeça. Para QUALQUER pergunta sobre os dados (gastos, renda, patrimônio, cofre, investimentos, extras, limites, sobra de um mês), você DEVE usar as ferramentas pra consultar o banco real. NUNCA invente números, nomes, datas ou categorias; se você não consultou, não afirme.",
  "RESOLVA datas relativas você mesma a partir da data de hoje (informada abaixo). 'Mês que vem', 'próximo mês', 'semana que vem', nomes de mês: converta para o mês concreto e use as ferramentas. NUNCA pergunte ao usuário que mês é esse, que dia é hoje, ou qualquer coisa que você possa deduzir ou buscar nos dados; perguntar o óbvio é falha grave.",
  "Para perguntas sobre um mês futuro (quanto vou sobrar, quanto posso gastar a mais), use a ferramenta projetar_mes e responda com NÚMEROS concretos. Nunca repita a sobra do mês atual como se fosse a do mês futuro.",
  "SEMPRE feche com uma recomendação concreta, não devolva a decisão crua pro usuário. Quando ele perguntar 'quanto posso gastar a mais', dê um valor recomendado: parta da sobra realista projetada, reserve uma parte para guardar/investir (use ~30% como padrão quando ele não tiver definido uma meta) e diga o teto de gasto extra que sobra. Deixe claro quais premissas você assumiu (ex: 'assumindo guardar 30% e seu gasto pessoal médio de R$ X').",
  "Quando o usuário perguntar se pode/deve comprar algo, use avaliar_compra e dê um veredito claro (pode / cuidado / evite) com os números.",
  "Seja proativa: além de responder, aponte gaps ou padrões que o usuário não notaria só olhando a tela (uma categoria que disparou, uma cobrança repetida, dinheiro parado no cofre sem render).",
  "Responda em português do Brasil, num tom direto, humano e honesto, em texto simples sem markdown. Use R$ e números claros. Não narre que vai usar ferramentas nem descreva seus passos; traga a resposta pronta depois de ter os dados.",
].join(" ");

// "YYYY-MM-DD" de uma data em UTC, pra ancorar a IA no dia/mes atual
function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// "YYYY-MM" do mes atual e do proximo, em UTC — resolvidos no servidor pra a IA nao errar
// "mes que vem" (ela tende a perguntar ao usuario quando precisa deduzir a data)
function monthContext(now: Date): string {
  const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `Mês atual: ${key(cur)}. Próximo mês ("mês que vem"): ${key(next)}.`;
}

// le o corpo SSE do Gemini e chama onChunk pra cada objeto JSON (linha "data: {...}").
// o stream pode quebrar um JSON em varios chunks de rede; por isso bufferizamos por linha.
async function readSse(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: { candidates?: { content?: GeminiContent; finishReason?: string }[] }) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      // uma linha data: malformada nao deve derrubar o stream inteiro
      try {
        onChunk(JSON.parse(payload));
      } catch {
        // ignora linha invalida (raro); seguimos lendo o resto
      }
    }
  }
}

// roda o loop agentico: a IA decide quais ferramentas chamar, executamos no banco e
// devolvemos o resultado, ate ela responder em texto (que e transmitido token a token).
// retorna o texto final completo (pra persistir). lanca em falha real (pra rota mandar erro).
export async function runAssistant(
  userId: string,
  history: ChatTurn[],
  message: string,
  apiKey: string,
  now: Date,
  onEvent: (e: AssistantEvent) => void,
  parentSignal: AbortSignal,
): Promise<string> {
  const systemInstruction = [PERSONA, "", `Hoje é ${todayKey(now)}. ${monthContext(now)}`].join("\n");

  // historico + a nova mensagem, no formato de contents do Gemini
  const contents: GeminiContent[] = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // aborta tudo se o cliente desconectar (parentSignal) ou estourar o tempo total
  const ac = new AbortController();
  const abort = () => ac.abort();
  if (parentSignal.aborted) ac.abort();
  else parentSignal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => ac.abort(), OVERALL_TIMEOUT_MS);

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // na ultima rodada forcamos texto (sem tools) pra garantir uma resposta final
      const mode = iteration < MAX_ITERATIONS - 1 ? "AUTO" : "NONE";

      const res = await fetch(`${ENDPOINT}?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: [{ functionDeclarations: toolDeclarations }],
          toolConfig: { functionCallingConfig: { mode } },
          // thinking ligado (budget pequeno): o assistente precisa raciocinar (resolver datas,
          // decidir tools, montar recomendacao) antes de responder. as "thought parts" sao
          // filtradas no parser pra nunca vazar o raciocinio pro usuario.
          generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 512 } },
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Gemini HTTP ${res.status}`);
      }

      // acumula o que veio nesta rodada
      let turnText = "";
      let streamedText = false;
      const calls: { name: string; args: Record<string, unknown>; id?: string; thoughtSignature?: string }[] = [];
      let finishReason: string | undefined;

      await readSse(res.body, (chunk) => {
        const cand = chunk.candidates?.[0];
        if (cand?.finishReason) finishReason = cand.finishReason;
        for (const part of cand?.content?.parts ?? []) {
          if (part.functionCall) {
            // guarda a thoughtSignature junto: com thinking + tools ela precisa voltar verbatim
            // no proximo turno, senao o Gemini perde a continuidade do raciocinio
            calls.push({
              name: part.functionCall.name,
              args: part.functionCall.args ?? {},
              id: part.functionCall.id,
              thoughtSignature: part.thoughtSignature,
            });
          } else if (part.thought) {
            // parte de raciocinio interno (thinking): consome e ignora, nunca vai pro usuario
            continue;
          } else if (typeof part.text === "string" && part.text.length > 0) {
            turnText += part.text;
            onEvent({ type: "token", text: part.text });
            streamedText = true;
          }
        }
      });

      // rodada sem ferramentas => e a resposta final
      if (calls.length === 0) {
        if (turnText.trim().length === 0) {
          throw new Error(`Gemini sem conteudo (finishReason=${finishReason ?? "desconhecido"})`);
        }
        return turnText;
      }

      // rodada com ferramentas: qualquer texto exibido foi preambulo, manda limpar no front
      if (streamedText) onEvent({ type: "reset" });

      // ecoa o turno do modelo (com os functionCall na ordem recebida + a thoughtSignature de
      // cada um) e roda cada ferramenta
      contents.push({
        role: "model",
        parts: calls.map((c) => ({
          functionCall: { name: c.name, args: c.args, ...(c.id ? { id: c.id } : {}) },
          ...(c.thoughtSignature ? { thoughtSignature: c.thoughtSignature } : {}),
        })),
      });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        onEvent({ type: "tool", name: call.name });
        const result = await executeTool(userId, call.name, call.args, now);
        // o parecer de compra (pode/cuidado/evite) vira um evento proprio pro front mostrar o
        // selo colorido na resposta; o veredito sai das regras da ferramenta, nao da IA
        if (call.name === "avaliar_compra") {
          const v = (result as { veredito?: unknown }).veredito;
          if (v === "pode" || v === "cuidado" || v === "evite") {
            onEvent({ type: "verdict", value: v });
          }
        }
        responseParts.push({
          // o id amarra a resposta a chamada certa quando ha varias na mesma rodada
          functionResponse: {
            name: call.name,
            ...(call.id ? { id: call.id } : {}),
            response: result as Record<string, unknown>,
          },
        } as GeminiPart);
      }
      contents.push({ role: "user", parts: responseParts });
    }

    // nao deveria chegar aqui (a ultima rodada e mode NONE e retorna texto), mas por seguranca:
    throw new Error("Assistente não conseguiu finalizar a resposta");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tempo esgotado ao gerar a resposta");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", abort);
  }
}
