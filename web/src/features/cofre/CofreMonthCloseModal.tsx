import { useEffect, useState } from "react";
import { Dialog, Heading, Label, Modal as AriaModal, ModalOverlay } from "react-aria-components";
import { Button } from "../../components/ui/Button";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { cn } from "../../lib/cn";
import { formatBRL } from "../../lib/format";
import { monthLabel } from "../../lib/month";
import { useConfirmMonthClose, type PendingMonth } from "./cofre.api";

// estado de confirmacao de cada mes: confirmar o valor calculado ou corrigir (com motivo)
type Entry = { mode: "confirm" | "adjust"; amount: number; reason: string };

const segBase = "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs outline-none transition";
const segActive = "bg-surface-2 text-heading shadow-card";
const segIdle = "text-muted hover:text-heading";

// modal BLOQUEANTE: nao dismissivel e sem botao de fechar — o usuario so sai confirmando os
// fechamentos pendentes. fica "na cara" dele no login enquanto houver mes sem confirmar.
export function CofreMonthCloseModal({ pendingMonths }: { pendingMonths: PendingMonth[] }) {
  const confirm = useConfirmMonthClose();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // inicializa cada mes pendente no modo "confirmar" com o valor calculado pelo app
  useEffect(() => {
    setEntries((prev) => {
      const next: Record<string, Entry> = {};
      for (const p of pendingMonths) {
        next[p.month] = prev[p.month] ?? {
          mode: "confirm",
          amount: p.computedSurplus > 0 ? p.computedSurplus : 0,
          reason: "",
        };
      }
      return next;
    });
  }, [pendingMonths]);

  function setEntry(month: string, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [month]: { ...prev[month], ...patch } }));
  }

  async function handleConfirmAll() {
    setError(null);
    // mes corrigido exige motivo
    for (const p of pendingMonths) {
      const e = entries[p.month];
      if (e?.mode === "adjust" && e.reason.trim().length === 0) {
        setError(`Escreva o motivo da correção de ${monthLabel(p.month)}.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      // fecha do mais antigo pro mais novo (pendingMonths vem em ordem crescente do backend)
      for (const p of pendingMonths) {
        const e = entries[p.month];
        const confirmedSurplus = e.mode === "adjust" ? e.amount : p.computedSurplus;
        const reason = e.mode === "adjust" ? e.reason.trim() : undefined;
        await confirm.mutateAsync({ month: p.month, confirmedSurplus, reason });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível fechar o mês.");
    } finally {
      setSubmitting(false);
    }
  }

  const multiple = pendingMonths.length > 1;

  return (
    <ModalOverlay
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <AriaModal className="w-full max-w-lg rounded-2xl border border-border bg-surface/95 shadow-card backdrop-blur outline-none">
        <Dialog className="outline-none">
          <div className="border-b border-border px-6 py-4">
            <Heading slot="title" className="text-lg font-medium text-heading">
              {multiple ? "Confirme o que sobrou nesses meses" : "Confirme o que sobrou no mês"}
            </Heading>
            <p className="mt-1 text-sm text-muted">
              {multiple
                ? "Você ficou um tempo fora. Confirme (ou corrija) a sobra de cada mês — ela vai pro seu cofre."
                : "Fechou o mês. Confirme se foi isso que sobrou — esse valor vai pro seu cofre."}
            </p>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-4">
              {pendingMonths.map((p) => {
                const e = entries[p.month];
                if (!e) return null;
                const negative = p.computedSurplus < 0;
                return (
                  <div key={p.month} className="rounded-xl border border-border bg-surface-2/50 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-heading">{monthLabel(p.month)}</span>
                      <span className={cn("tnum text-sm", negative ? "text-negative" : "text-heading")}>
                        {negative ? "−" : ""}
                        {formatBRL(Math.abs(p.computedSurplus))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-faint">
                      {negative ? "Pelo app, você fechou no negativo." : "Foi o que o app calculou."}
                    </p>

                    <div className="mt-3 flex gap-1 rounded-lg border border-border bg-surface/60 p-1">
                      <button
                        type="button"
                        onClick={() => setEntry(p.month, { mode: "confirm" })}
                        className={cn(segBase, e.mode === "confirm" ? segActive : segIdle)}
                      >
                        Está certo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntry(p.month, { mode: "adjust" })}
                        className={cn(segBase, e.mode === "adjust" ? segActive : segIdle)}
                      >
                        Foi outro valor
                      </button>
                    </div>

                    {e.mode === "adjust" && (
                      <div className="mt-3 flex flex-col gap-3">
                        <MoneyInput
                          label="Quanto sobrou de verdade"
                          value={e.amount}
                          onChange={(v) => setEntry(p.month, { amount: v })}
                        />
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm text-muted">Motivo da diferença</Label>
                          <textarea
                            value={e.reason}
                            onChange={(ev) => setEntry(p.month, { reason: ev.target.value })}
                            rows={2}
                            maxLength={300}
                            placeholder="Ex: tive um gasto que não registrei no app"
                            className={cn(
                              "w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
                              "placeholder:text-faint outline-none transition",
                              "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
                            )}
                          />
                          <p className="text-xs text-faint">
                            A Mira usa esse motivo pra entender gastos ou ganhos que passaram fora do app.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-4">
            {error && <p className="text-sm text-negative">{error}</p>}
            <Button
              onPress={handleConfirmAll}
              isPending={submitting}
              isDisabled={submitting}
              className="w-full justify-center"
            >
              {submitting ? "Confirmando..." : multiple ? "Confirmar fechamentos" : "Confirmar fechamento"}
            </Button>
          </div>
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
