import { useState } from "react";
import { Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { formatBRL } from "../../../lib/format";
import { PersonalExpenseFormModal } from "./PersonalExpenseFormModal";
import {
  useDeletePersonalExpense,
  usePersonalExpenses,
  usePersonalSummary,
  type PersonalExpense,
} from "../personal.api";

// "2026-05-29" -> "29 mai" (meia-dia local evita o shift de fuso ao formatar)
function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ComprasTab() {
  const { data: expenses, isLoading } = usePersonalExpenses();
  const { data: summary } = usePersonalSummary();
  const remove = useDeletePersonalExpense();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalExpense | undefined>();
  const [toDelete, setToDelete] = useState<PersonalExpense | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(expense: PersonalExpense) {
    setEditing(expense);
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
          <p className="text-sm text-muted">Suas compras do dia a dia</p>
          {summary && (
            <p className="tnum mt-0.5 text-sm text-heading">
              {formatBRL(summary.monthTotal)} <span className="text-faint">neste mês</span>
            </p>
          )}
        </div>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          Adicionar gasto
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : !expenses?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ShoppingBag className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Nenhum gasto pessoal registrado ainda.</p>
            <p className="text-xs text-faint">Registre suas compras para a Mira acompanhar de perto.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="flex items-center gap-4 px-5 py-4">
              <span className="tnum w-14 shrink-0 text-xs text-faint">{formatDay(expense.spentAt)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-heading">{expense.name}</p>
                <p className="truncate text-xs text-faint">{expense.category}</p>
              </div>
              <span className="tnum shrink-0 text-sm text-heading">{formatBRL(expense.amount)}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(expense)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
                  aria-label="Editar gasto"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(expense)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                  aria-label="Excluir gasto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <PersonalExpenseFormModal isOpen={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir gasto"
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa ação não pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
