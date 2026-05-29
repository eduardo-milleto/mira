import { useState } from "react";
import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { cn } from "../../lib/cn";
import { formatBRL } from "../../lib/format";
import { monthLabel } from "../../lib/month";
import { CofreMovementModal } from "./CofreMovementModal";
import { useCofre, useDeleteMovement, type CofreMovement } from "./cofre.api";

// rotulo amigavel da origem do movimento
const SOURCE_LABEL: Record<string, string> = {
  sobra: "Sobra do mês",
  gasto_extra: "Gasto extra",
  ajuste: "Ajuste",
  aporte: "Aporte",
  resgate: "Resgate",
};

// "2026-05-29" -> "29 mai" (meia-dia local evita o shift de fuso ao formatar)
function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const actionBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5";

export function CofrePage() {
  const { data, isLoading } = useCofre();
  const remove = useDeleteMovement();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CofreMovement | undefined>();
  const [toDelete, setToDelete] = useState<CofreMovement | undefined>();

  const balance = data?.balance ?? 0;
  const movements = data?.movements ?? [];
  const closes = data?.closes ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(movement: CofreMovement) {
    setEditing(movement);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, { onSuccess: () => setToDelete(undefined) });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Cofre</h1>
        <p className="mt-2 text-sm font-light text-muted">
          O que sobra de cada mês fica aqui. É daqui que saem seus aportes e gastos extras.
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted">Saldo do cofre</p>
        <p
          className={cn(
            "tnum mt-2 text-4xl font-light tracking-tighter",
            balance < 0 ? "text-negative" : "text-heading",
          )}
        >
          {balance < 0 ? "−" : ""}
          {formatBRL(Math.abs(balance))}
        </p>
        {balance < 0 && (
          <p className="mt-2 text-xs text-negative">Você gastou além do que tinha guardado.</p>
        )}
      </Card>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Movimentações</p>
          <Button onPress={openCreate} className="px-4 py-2.5">
            <Plus className="h-4 w-4" />
            Lançar movimentação
          </Button>
        </div>

        <Card className="divide-y divide-border">
          {isLoading ? (
            <p className="p-6 text-sm text-muted">Carregando...</p>
          ) : !movements.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <PiggyBank className="h-8 w-8 text-faint" />
              <p className="text-sm text-muted">Nenhuma movimentação ainda.</p>
              <p className="text-xs text-faint">
                A sobra do mês entra aqui quando você fecha o mês.
              </p>
            </div>
          ) : (
            movements.map((m) => {
              const isEntrada = m.direction === "entrada";
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="tnum w-14 shrink-0 text-xs text-faint">
                    {formatDay(m.occurredAt)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-heading">
                      {m.notes || SOURCE_LABEL[m.source] || "Movimentação"}
                    </p>
                    <p className="truncate text-xs text-faint">{SOURCE_LABEL[m.source] ?? m.source}</p>
                  </div>
                  <span
                    className={cn("tnum shrink-0 text-sm", isEntrada ? "text-brand" : "text-negative")}
                  >
                    {isEntrada ? "+" : "−"}
                    {formatBRL(m.amount)}
                  </span>
                  {/* aporte/resgate (com investmentId) sao geridos na tela de investimentos */}
                  {m.investmentId ? (
                    <span className="shrink-0 text-xs text-faint">via investimento</span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className={cn(actionBtn, "hover:text-heading")}
                        aria-label="Editar movimentação"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(m)}
                        className={cn(actionBtn, "hover:text-negative")}
                        aria-label="Excluir movimentação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      </div>

      {closes.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Fechamentos de mês</p>
          <Card className="divide-y divide-border">
            {closes.map((c) => {
              const corrected = c.reason != null;
              return (
                <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-heading">{monthLabel(c.month)}</p>
                    {corrected && <p className="mt-0.5 text-xs text-faint">Corrigido: {c.reason}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="tnum text-sm text-heading">{formatBRL(c.confirmedSurplus)}</span>
                    {corrected && (
                      <p className="tnum text-xs text-faint">app: {formatBRL(c.computedSurplus)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      <CofreMovementModal isOpen={formOpen} onOpenChange={setFormOpen} movement={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir movimentação"
        description="Tem certeza que deseja excluir essa movimentação? Essa ação não pode ser desfeita."
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
