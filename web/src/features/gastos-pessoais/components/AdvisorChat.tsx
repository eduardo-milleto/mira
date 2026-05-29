import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { cn } from "../../../lib/cn";
import {
  useChat,
  useClearChat,
  useSendMessage,
  type AdvisorMessage,
  type Verdict,
} from "../personal.api";

// pill do veredito (so aparece quando a pergunta foi sobre uma compra)
const VERDICT_META: Record<Exclude<Verdict, "neutro">, { label: string; className: string }> = {
  pode: { label: "Pode comprar", className: "bg-brand-soft text-brand" },
  cuidado: { label: "Cuidado", className: "bg-amber-500/10 text-amber-400" },
  evite: { label: "Melhor evitar", className: "bg-negative/10 text-negative" },
};

function Bubble({ message, verdict }: { message: AdvisorMessage; verdict?: Verdict }) {
  const isUser = message.role === "user";
  const meta = verdict && verdict !== "neutro" ? VERDICT_META[verdict] : null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-brand-gradient text-black"
            : "border border-border bg-surface/60 text-heading backdrop-blur",
        )}
      >
        {meta && (
          <span className={cn("mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
            {meta.label}
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function AdvisorChat() {
  const { data: messages, isLoading } = useChat();
  const send = useSendMessage();
  const clear = useClearChat();

  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  // veredito por id da mensagem do assistente (so das respostas desta sessao)
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // rola pro fim quando chega mensagem nova ou enquanto a Mira responde
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, send.isPending]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || send.isPending) return;
    setInput("");
    send.mutate(content, {
      onSuccess: (data) => setVerdicts((v) => ({ ...v, [data.assistantMessage.id]: data.verdict })),
      onError: () => setInput(content), // devolve o texto pro usuario tentar de novo
    });
  }

  const empty = !isLoading && !messages?.length && !send.isPending;

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[480px] flex-col">
      <div className="flex items-center justify-between gap-4 pb-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Sparkles className="h-4 w-4 text-brand" />
          Pergunte à Mira antes de comprar
        </p>
        {!!messages?.length && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-xs text-faint transition hover:text-negative"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar conversa
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-surface/40 p-5"
      >
        {isLoading ? (
          <p className="text-sm text-muted">Carregando conversa...</p>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="h-8 w-8 text-brand" />
            <p className="text-sm text-heading">Oi! Sou a Mira.</p>
            <p className="max-w-sm text-sm font-light text-muted">
              Me pergunte coisas como "posso comprar um tênis de R$ 800?" — eu olho sua renda,
              seus gastos, seus limites e suas metas pra te responder de verdade.
            </p>
          </div>
        ) : (
          <>
            {messages?.map((m) => (
              <Bubble key={m.id} message={m} verdict={verdicts[m.id]} />
            ))}
            {/* bolha otimista enquanto a resposta nao chega */}
            {send.isPending && send.variables && (
              <Bubble
                message={{ id: "pending", role: "user", content: send.variables, createdAt: "" }}
              />
            )}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted backdrop-blur">
                  A Mira está pensando...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {send.isError && (
        <p className="pt-3 text-sm text-negative">{send.error.message}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posso comprar...?"
          className={cn(
            "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
            "placeholder:text-faint outline-none transition",
            "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
          )}
        />
        <Button type="submit" isPending={send.isPending} isDisabled={!input.trim() || send.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <ConfirmDialog
        isOpen={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpar conversa"
        description="Isso apaga todo o histórico do chat com a Mira. Essa ação não pode ser desfeita."
        confirmLabel="Limpar"
        isPending={clear.isPending}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
      />
    </div>
  );
}
