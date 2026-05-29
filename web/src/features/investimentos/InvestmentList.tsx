import { useState } from "react";
import { Pencil, Plus, TrendingUp, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { InvestmentFormModal } from "./InvestmentFormModal";
import { buildPatrimony } from "./patrimony";
import { useDeleteInvestment, useInvestments, type Investment } from "./investimentos.api";

// agrupa os investimentos por categoria, mantendo a ordem de maior pra menor categoria
function groupByCategory(investments: Investment[]): { category: string; items: Investment[] }[] {
  const order = buildPatrimony(investments).items.map((i) => i.name);
  const map = new Map<string, Investment[]>();
  for (const inv of investments) {
    const list = map.get(inv.category) ?? [];
    list.push(inv);
    map.set(inv.category, list);
  }
  return order.map((category) => ({ category, items: map.get(category) ?? [] }));
}

export function InvestmentList() {
  const { data: investments, isLoading } = useInvestments();
  const remove = useDeleteInvestment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [toDelete, setToDelete] = useState<Investment | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(investment: Investment) {
    setEditing(investment);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, { onSuccess: () => setToDelete(undefined) });
  }

  const groups = investments ? groupByCategory(investments) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Seus ativos cadastrados, agrupados por categoria</p>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          Adicionar investimento
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted">Carregando...</Card>
      ) : !investments?.length ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <TrendingUp className="h-8 w-8 text-faint" />
          <p className="text-sm text-muted">Nenhum investimento cadastrado ainda.</p>
          <p className="text-xs text-faint">
            Cadastre seus ativos pra ver o patrimônio e a projeção na Visão geral.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const total = group.items.reduce((sum, i) => sum + i.value, 0);
            return (
              <Card key={group.category} className="overflow-hidden">
                <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
                  <span className="text-sm text-heading">{group.category}</span>
                  <span className="tnum text-sm text-muted">{formatBRL(total)}</span>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-heading">{inv.name}</p>
                        {(inv.expectedReturnPct != null || inv.notes) && (
                          <p className="truncate text-xs text-faint">
                            {inv.expectedReturnPct != null && (
                              <span className="tnum">{inv.expectedReturnPct}% a.a.</span>
                            )}
                            {inv.expectedReturnPct != null && inv.notes && " · "}
                            {inv.notes}
                          </p>
                        )}
                      </div>
                      <span className="tnum shrink-0 text-sm text-heading">{formatBRL(inv.value)}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(inv)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
                          aria-label="Editar investimento"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(inv)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                          aria-label="Excluir investimento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <InvestmentFormModal isOpen={formOpen} onOpenChange={setFormOpen} investment={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir investimento"
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa ação não pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
