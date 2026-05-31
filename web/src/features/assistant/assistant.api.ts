import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "../../lib/api";

export type AssistantMessage = {
  id: string;
  role: string; // "user" | "assistant"
  content: string;
  createdAt: string;
};

export type Verdict = "pode" | "cuidado" | "evite";

export const assistantChatKey = ["assistant-chat"] as const;

// historico persistido do chat do assistente
export function useAssistantMessages(enabled = true) {
  return useQuery({
    queryKey: assistantChatKey,
    queryFn: () =>
      api.get<{ messages: AssistantMessage[] }>("/assistant/messages").then((r) => r.messages),
    enabled,
  });
}

// nomes amigaveis das ferramentas pro indicador de status ("consultando ...")
const TOOL_LABELS: Record<string, string> = {
  panorama: "montando seu panorama",
  buscar: "procurando nos seus dados",
  agregar_gastos: "somando seus gastos",
  avaliar_compra: "avaliando a compra",
};

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? "consultando seus dados";
}

// eventos que o stream do backend emite (via SSE)
export type StreamHandlers = {
  onToken: (text: string) => void; // pedaco de texto da resposta
  onTool: (name: string) => void; // a IA comecou a usar uma ferramenta
  onVerdict: (value: Verdict) => void; // parecer pode/cuidado/evite
  onReset: () => void; // descarta o texto parcial (era preambulo antes de uma tool)
  onDone: (data: { userMessage: AssistantMessage; assistantMessage: AssistantMessage }) => void;
  onError: (message: string) => void;
};

// le um stream SSE (event: <nome>\n data: <json>\n\n) e despacha pros handlers. o parser
// bufferiza por blocos separados por linha em branco, porque um evento pode chegar partido
// em varios chunks de rede.
async function readStream(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, dataRaw: string) => {
    let data: unknown = {};
    try {
      data = dataRaw ? JSON.parse(dataRaw) : {};
    } catch {
      return; // bloco malformado: ignora sem derrubar o stream
    }
    const d = data as Record<string, unknown>;
    switch (event) {
      case "token":
        if (typeof d.text === "string") handlers.onToken(d.text);
        break;
      case "tool":
        if (typeof d.name === "string") handlers.onTool(d.name);
        break;
      case "verdict":
        if (d.value === "pode" || d.value === "cuidado" || d.value === "evite") {
          handlers.onVerdict(d.value);
        }
        break;
      case "reset":
        handlers.onReset();
        break;
      case "done":
        handlers.onDone(
          d as unknown as { userMessage: AssistantMessage; assistantMessage: AssistantMessage },
        );
        break;
      case "error":
        handlers.onError(typeof d.error === "string" ? d.error : "Nao foi possivel responder agora");
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal.aborted) break;
    buffer += decoder.decode(value, { stream: true });

    // processa blocos completos (separados por linha em branco)
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      dispatch(event, data);
    }
  }
}

// dispara o chat com streaming. nao usa o wrapper `api` porque precisamos do corpo cru (stream),
// e nao do res.json(). mantem credentials e o header Origin (CSRF por origem no backend).
export async function streamAssistantChat(
  content: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
      signal,
    });
  } catch {
    if (!signal.aborted) handlers.onError("Sem conexao com o servidor");
    return;
  }

  // erros tratados (503 sem chave, 400 validacao, 401 sessao) vem como JSON, nao stream
  if (!res.ok || !res.body) {
    let message = "Nao foi possivel responder agora";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // sem corpo legivel: mantem a mensagem padrao
    }
    handlers.onError(message);
    return;
  }

  try {
    await readStream(res.body, handlers, signal);
  } catch {
    if (!signal.aborted) handlers.onError("A conexao caiu durante a resposta");
  }
}

// limpa todo o historico do assistente
export function useClearAssistant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<null>("/assistant/messages"),
    onSuccess: () => qc.setQueryData(assistantChatKey, []),
  });
}
