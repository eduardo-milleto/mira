import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { formatBRL } from "../../../lib/format";
import { currentMonthKey } from "../../../lib/month";
import { ExtraFormModal } from "./ExtraFormModal";
import { useDeleteExtra, useExtras, type Extra, type ExtraKind } from "../extras.api";

// "2026-05-29" -> "29 mai" (meia-dia local evita o shift de fuso ao formatar)
function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ExtrasList({ kind }: { kind: ExtraKind }) {
  const { data: extras, isLoading } = useExtras(kind);
  const remove = useDeleteExtra();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Extra | undefined>();
  const [toDelete, setToDelete] = useState<Extra | undefined>();

  const isGanho = kind === "ganho";
  const noun = isGanho ? "ganho" : "gasto";
  const EmptyIcon = isGanho ? ArrowUpCircle : ArrowDownCircle;

  // total do mes corrente desse tipo (mostrado como referencia no topo)
  const month = currentMonthKey();
  const monthTotal = (extras ?? [])
    .filter((e) => e.occurredAt.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(extra: Extra) {
    setEditing(extra);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, { onSuccess: () => setToDelete(undefined) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {isGanho ? "Ganhos pontuais que entraram" : "Gastos pontuais que saíram"}
          </p>
          <p className="tnum mt-0.5 text-sm text-heading">
            {formatBRL(monthTotal)} <span className="text-faint">neste mês</span>
          </p>
        </div>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          Adicionar {noun}
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : !extras?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <EmptyIcon className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Nenhum {noun} extra registrado ainda.</p>
            <p className="text-xs text-faint">
              {isGanho
                ? "Recebeu um valor a mais num mês? Registre aqui."
                : "Teve uma despesa fora do comum? Registre aqui."}
            </p>
          </div>
        ) : (
          extras.map((extra) => (
            <div key={extra.id} className="flex items-center gap-4 px-5 py-4">
              <span className="tnum w-14 shrink-0 text-xs text-faint">{formatDay(extra.occurredAt)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-heading">{extra.description}</p>
                {extra.category && <p className="truncate text-xs text-faint">{extra.category}</p>}
              </div>
              <span className={`tnum shrink-0 text-sm ${isGanho ? "text-brand" : "text-negative"}`}>
                {isGanho ? "+" : "−"}
                {formatBRL(extra.amount)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(extra)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
                  aria-label={`Editar ${noun}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(extra)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                  aria-label={`Excluir ${noun}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <ExtraFormModal isOpen={formOpen} onOpenChange={setFormOpen} kind={kind} extra={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title={`Excluir ${noun} extra`}
        description={`Tem certeza que deseja excluir "${toDelete?.description}"? Essa ação não pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
