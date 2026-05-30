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
  | { type: "reset" }; // descarta o texto parcial ja exibido (era so preambulo antes de uma tool)

// estrutura minima de um part vindo do Gemini
type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
};
type GeminiContent = { role?: string; parts?: GeminiPart[] };

const PERSONA = [
  "Voce e a Mira, a assistente financeira pessoal do usuario dentro do app Mira.",
  "Voce NAO sabe nada sobre as financas dele de cabeca. Para QUALQUER pergunta sobre os dados (gastos, renda, patrimonio, cofre, investimentos, extras, limites), voce DEVE usar as ferramentas pra consultar o banco de dados real. NUNCA invente numeros, nomes, datas ou categorias — se voce nao consultou, nao afirme.",
  "Se a busca nao retornar nada, diga honestamente que nao encontrou aquilo nos dados — nao chute.",
  "Quando o usuario perguntar se pode ou deve comprar/gastar algo, use a ferramenta avaliar_compra e de um veredito claro (pode / cuidado / evite) explicando com os numeros reais.",
  "Seja proativa: alem de responder, aponte gaps ou padroes relevantes que o usuario provavelmente nao notaria so olhando a tela (ex: uma categoria que disparou, uma cobranca repetida, dinheiro parado no cofre sem render).",
  "Responda sempre em portugues do Brasil, num tom direto, humano e honesto. Use R$ e numeros claros. Nao narre que vai usar ferramentas nem descreva seus passos — apenas traga a resposta depois de ter os dados.",
].join(" ");

// "YYYY-MM-DD" de uma data em UTC, pra ancorar a IA no dia/mes atual
function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
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
  const systemInstruction = [PERSONA, "", `Hoje e ${todayKey(now)}.`].join("\n");

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
          generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Gemini HTTP ${res.status}`);
      }

      // acumula o que veio nesta rodada
      let turnText = "";
      let streamedText = false;
      const calls: { name: string; args: Record<string, unknown>; id?: string }[] = [];
      let finishReason: string | undefined;

      await readSse(res.body, (chunk) => {
        const cand = chunk.candidates?.[0];
        if (cand?.finishReason) finishReason = cand.finishReason;
        for (const part of cand?.content?.parts ?? []) {
          if (part.functionCall) {
            calls.push({
              name: part.functionCall.name,
              args: part.functionCall.args ?? {},
              id: part.functionCall.id,
            });
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

      // rodada com ferramentas: qualquer texto exibido foi preambulo — manda limpar no front
      if (streamedText) onEvent({ type: "reset" });

      // ecoa o turno do modelo (com os functionCall na ordem recebida) e roda cada ferramenta
      contents.push({
        role: "model",
        parts: calls.map((c) => ({
          functionCall: { name: c.name, args: c.args, ...(c.id ? { id: c.id } : {}) },
        })),
      });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        onEvent({ type: "tool", name: call.name });
        const result = await executeTool(userId, call.name, call.args, now);
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
    throw new Error("Assistente nao conseguiu finalizar a resposta");
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
