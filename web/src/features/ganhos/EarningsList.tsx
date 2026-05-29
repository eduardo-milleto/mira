import { useState } from "react";
import { Pencil, Plus, TrendingUp, Trash2, Wallet } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { IncomeFormModal } from "../projecoes/IncomeFormModal";
import { useDeleteIncome, useIncomes, type IncomeSource } from "../projecoes/projecoes.api";

// "8,5" sem zeros a toa pra exibir o percentual
function fmtPct(v: number): string {
  return String(v).replace(".", ",");
}

// gestao das fontes de renda mensais (criar/editar/excluir). mesma base que alimenta
// a composicao dos ganhos e a projecao da Mira.
export function EarningsList() {
  const { data: incomes, isLoading } = useIncomes();
  const remove = useDeleteIncome();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | undefined>();
  const [toDelete, setToDelete] = useState<IncomeSource | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(income: IncomeSource) {
    setEditing(income);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, { onSuccess: () => setToDelete(undefined) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Suas fontes de renda mensais</p>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          Adicionar fonte de renda
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : !incomes?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Wallet className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Nenhuma fonte de renda cadastrada ainda.</p>
            <p className="text-xs text-faint">
              Adicione seu salário e outras rendas para ver seus ganhos e a projeção.
            </p>
          </div>
        ) : (
          incomes.map((income) => (
            <div key={income.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-heading">{income.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                  {income.annualGrowthPct !== 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {fmtPct(income.annualGrowthPct)}% ao ano
                    </span>
                  )}
                  {income.startYear != null && (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">
                      a partir de {income.startYear}
                    </span>
                  )}
                </div>
              </div>
              <span className="tnum shrink-0 text-sm text-heading">
                {formatBRL(income.monthlyAmount)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(income)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
                  aria-label="Editar fonte de renda"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(income)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                  aria-label="Excluir fonte de renda"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <IncomeFormModal isOpen={formOpen} onOpenChange={setFormOpen} income={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir fonte de renda"
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa ação não pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
