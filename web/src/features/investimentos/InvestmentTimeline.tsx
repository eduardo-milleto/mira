import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { cn } from "../../lib/cn";
import { formatBRL } from "../../lib/format";
import { InvestmentEventModal } from "./InvestmentEventModal";
import {
  useDeleteInvestmentEvent,
  useInvestmentEvents,
  type Investment,
  type InvestmentEvent,
} from "./investimentos.api";

const TYPE_LABEL: Record<string, string> = {
  saldo_inicial: "Saldo inicial",
  aporte: "Aporte",
  rendimento: "Rendimento",
  resgate: "Resgate",
  valorizacao: "Valorização",
  depreciacao: "Depreciação",
};

// "2026-05-29" -> "29 mai 26" (meia-dia local evita o shift de fuso ao formatar)
function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function InvestmentTimeline({ investment }: { investment: Investment }) {
  const { data: events, isLoading } = useInvestmentEvents(investment.id);
  const del = useDeleteInvestmentEvent();
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InvestmentEvent | undefined>();

  function confirmDelete() {
    if (!toDelete) return;
    del.mutate(
      { investmentId: investment.id, eventId: toDelete.id },
      { onSuccess: () => setToDelete(undefined) },
    );
  }

  // backend devolve em ordem crescente; mostramos do mais recente pro mais antigo
  const ordered = events ? [...events].reverse() : [];

  return (
    <div className="border-t border-border bg-surface-2/30 px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-faint">Linha do tempo</span>
        <Button variant="outline" onPress={() => setModalOpen(true)} className="px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Registrar movimentação
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : !ordered.length ? (
        <p className="text-sm text-muted">Sem movimentações ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {ordered.map((e) => {
            const isInicial = e.type === "saldo_inicial";
            const positive = e.delta >= 0;
            return (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className="tnum w-16 shrink-0 text-xs text-faint">{formatDay(e.occurredAt)}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-heading">{TYPE_LABEL[e.type] ?? e.type}</span>
                  {e.notes && <span className="text-faint"> · {e.notes}</span>}
                </div>
                <span
                  className={cn(
                    "tnum shrink-0 text-xs",
                    isInicial ? "text-muted" : positive ? "text-brand" : "text-negative",
                  )}
                >
                  {isInicial ? "" : positive ? "+" : "−"}
                  {formatBRL(Math.abs(e.delta))}
                </span>
                <span className="tnum w-24 shrink-0 text-right text-xs text-faint">
                  {formatBRL(e.valueAfter)}
                </span>
                {isInicial ? (
                  <span className="w-7 shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setToDelete(e)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                    aria-label="Excluir movimentação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <InvestmentEventModal isOpen={modalOpen} onOpenChange={setModalOpen} investment={investment} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir movimentação"
        description="Isso reverte o efeito no valor do ativo (e no cofre, se foi aporte ou resgate). Não dá pra desfazer."
        isPending={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
