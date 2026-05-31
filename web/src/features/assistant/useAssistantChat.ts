import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  assistantChatKey,
  streamAssistantChat,
  toolLabel,
  type AssistantMessage,
  type Verdict,
} from "./assistant.api";

// estado de um turno em andamento (a resposta sendo transmitida)
type LiveState = {
  pendingUser: string | null; // bolha otimista do usuario enquanto a resposta nao fecha
  streamingText: string; // texto da resposta sendo digitado
  toolStatus: string | null; // "procurando nos seus dados..." enquanto a IA consulta o banco
  liveVerdict: Verdict | null; // parecer da avaliacao de compra deste turno
  isStreaming: boolean;
  error: string | null;
};

const IDLE: LiveState = {
  pendingUser: null,
  streamingText: "",
  toolStatus: null,
  liveVerdict: null,
  isStreaming: false,
  error: null,
};

// orquestra o chat: mantem o estado do turno ao vivo e, ao terminar, anexa as duas mensagens
// persistidas ao cache do historico. veredito fica por id da mensagem (so nesta sessao, igual
// a consultora — o backend nao persiste o veredito, so o texto).
export function useAssistantChat() {
  const qc = useQueryClient();
  const [live, setLive] = useState<LiveState>(IDLE);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const abortRef = useRef<AbortController | null>(null);

  // cancela qualquer stream em andamento ao desmontar (troca de pagina, fechar app)
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    (raw: string) => {
      const content = raw.trim();
      if (!content || live.isStreaming) return;

      // novo turno: aborta o anterior por seguranca e zera o estado ao vivo
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLive({ ...IDLE, pendingUser: content, isStreaming: true });

      // captura o veredito do turno sem depender do setState assincrono no done
      let capturedVerdict: Verdict | null = null;

      void streamAssistantChat(
        content,
        {
          onToken: (text) =>
            // primeiro token da resposta: limpa o status de ferramenta (a resposta chegou)
            setLive((s) => ({ ...s, streamingText: s.streamingText + text, toolStatus: null })),
          onTool: (name) =>
            setLive((s) => ({ ...s, toolStatus: toolLabel(name) })),
          onVerdict: (value) => {
            capturedVerdict = value;
            setLive((s) => ({ ...s, liveVerdict: value }));
          },
          // preambulo antes de uma ferramenta: descarta o texto parcial ja mostrado
          onReset: () => setLive((s) => ({ ...s, streamingText: "" })),
          onDone: ({ userMessage, assistantMessage }) => {
            // anexa as mensagens reais ao historico e encerra o estado ao vivo
            qc.setQueryData<AssistantMessage[]>(assistantChatKey, (old = []) => [
              ...old,
              userMessage,
              assistantMessage,
            ]);
            if (capturedVerdict) {
              setVerdicts((v) => ({ ...v, [assistantMessage.id]: capturedVerdict! }));
            }
            setLive(IDLE);
          },
          onError: (message) =>
            setLive((s) => ({ ...s, isStreaming: false, toolStatus: null, error: message })),
        },
        ac.signal,
      );
    },
    [live.isStreaming, qc],
  );

  // limpa so o erro (pra reenviar)
  const clearError = useCallback(() => setLive((s) => ({ ...s, error: null })), []);

  return { live, verdicts, send, clearError };
}
