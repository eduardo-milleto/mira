import { useState } from "react";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { useDeleteExpense, useExpenses, type Expense } from "./gastos.api";

export function ExpensesTab() {
  const { data: expenses, isLoading } = useExpenses();
  const remove = useDeleteExpense();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>();
  const [toDelete, setToDelete] = useState<Expense | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
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
        <p className="text-sm text-muted">Seus gastos mensais cadastrados</p>
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
            <Receipt className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Nenhum gasto cadastrado ainda.</p>
            <p className="text-xs text-faint">Adicione seu primeiro gasto para ver na Visao geral.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="flex items-center gap-4 px-5 py-4">
              <span className="min-w-0 flex-1 truncate text-sm text-heading">{expense.name}</span>
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

      <ExpenseFormModal isOpen={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir gasto"
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa acao nao pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
