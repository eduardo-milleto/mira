import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, Trash2, X, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { cn } from "../../lib/cn";
import { useAssistantMessages, useClearAssistant, type AssistantMessage, type Verdict } from "./assistant.api";
import { useAssistantChat } from "./useAssistantChat";
import { VerdictPill } from "./VerdictPill";

// sugestoes de partida (so aparecem no estado vazio) pra mostrar o que o assistente faz
const SUGGESTIONS = [
  "Onde posso economizar este mes?",
  "Quanto gasto com delivery?",
  "Posso gastar R$ 500 com um fone?",
];

function Bubble({
  role,
  content,
  verdict,
  pending,
}: {
  role: string;
  content: string;
  verdict?: Verdict;
  pending?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-brand-gradient text-black"
            : "border border-border bg-surface-2/80 text-heading backdrop-blur",
          pending && "opacity-80",
        )}
      >
        {verdict && <VerdictPill verdict={verdict} />}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

// tres pontinhos pulsando enquanto a IA pensa/consulta (sem texto ainda)
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:-200ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:-100ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
    </span>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { data: messages, isLoading } = useAssistantMessages();
  const clear = useClearAssistant();
  const { live, verdicts, send, clearError } = useAssistantChat();

  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // foca o campo ao abrir
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // rola pro fim a cada novidade (mensagem nova, token, status de ferramenta)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, live.streamingText, live.toolStatus, live.pendingUser, live.error]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || live.isStreaming) return;
    if (live.error) clearError();
    setInput("");
    send(content);
  }

  function handleSuggestion(text: string) {
    if (live.isStreaming) return;
    send(text);
  }

  const empty = !isLoading && !messages?.length && !live.isStreaming && !live.pendingUser;
  // o assistente esta "pensando" antes do primeiro token (consultando ferramenta ou aguardando)
  const thinking = live.isStreaming && live.streamingText.length === 0;

  return (
    <div
      className={cn(
        "flex w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl",
        "border border-border bg-surface/95 shadow-card backdrop-blur",
        "h-[min(600px,calc(100vh-7rem))]",
      )}
      role="dialog"
      aria-label="Assistente Mira"
    >
      {/* cabecalho */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient">
            <Sparkles className="h-3.5 w-3.5 text-black" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-heading">Mira</p>
            <p className="text-[11px] text-faint">Sua assistente financeira</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!!messages?.length && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
              aria-label="Limpar conversa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* corpo: mensagens */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-muted">Carregando conversa...</p>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
              <Sparkles className="h-6 w-6 text-brand" />
            </span>
            <div>
              <p className="text-sm text-heading">Oi! Sou a Mira.</p>
              <p className="mx-auto mt-1 max-w-[280px] text-xs font-light leading-relaxed text-muted">
                Eu olho seus dados de verdade pra te responder. Posso achar gastos, somar por
                categoria e dizer se cabe no seu mes.
              </p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestion(s)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-left text-xs text-muted transition hover:border-brand/40 hover:text-heading"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-faint" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages?.map((m: AssistantMessage) => (
              <Bubble key={m.id} role={m.role} content={m.content} verdict={verdicts[m.id]} />
            ))}

            {/* bolha otimista do usuario enquanto a resposta nao fecha */}
            {live.pendingUser && <Bubble role="user" content={live.pendingUser} pending />}

            {/* parecer ao vivo + texto sendo digitado */}
            {live.isStreaming && live.streamingText.length > 0 && (
              <Bubble role="assistant" content={live.streamingText} verdict={live.liveVerdict ?? undefined} />
            )}

            {/* status enquanto pensa/consulta (antes do primeiro token) */}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2/80 px-3.5 py-2.5 text-xs text-muted backdrop-blur">
                  <TypingDots />
                  <span>{live.toolStatus ?? "pensando"}...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* erro do turno */}
      {live.error && (
        <p className="px-4 pb-1 text-xs text-negative" role="alert">
          {live.error}
        </p>
      )}

      {/* composer */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-3 py-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre suas financas..."
          aria-label="Mensagem"
          className={cn(
            "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-heading",
            "placeholder:text-faint outline-none transition",
            "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
          )}
        />
        <Button
          type="submit"
          isDisabled={!input.trim() || live.isStreaming}
          className="!px-3 !py-2.5"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <ConfirmDialog
        isOpen={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpar conversa"
        description="Isso apaga todo o historico do chat com a Mira. Essa acao nao pode ser desfeita."
        confirmLabel="Limpar"
        isPending={clear.isPending}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
      />
    </div>
  );
}

// launcher flutuante no canto inferior direito + painel do chat. presente em todas as paginas.
export function AssistantWidget() {
  const [open, setOpen] = useState(false);

  // fecha com ESC quando aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && <ChatPanel onClose={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        aria-expanded={open}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-glow outline-none transition",
          "bg-brand-gradient text-black hover:brightness-110",
          "focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  );
}
