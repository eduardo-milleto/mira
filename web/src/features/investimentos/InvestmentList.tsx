import { useState } from "react";
import { Landmark, Pencil, Plus, TrendingUp, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { InvestmentFormModal } from "./InvestmentFormModal";
import { buildPatrimony } from "./patrimony";
import {
  investmentKindOf,
  useDeleteInvestment,
  useInvestments,
  type Investment,
  type InvestmentKind,
} from "./investimentos.api";

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

// textos que mudam entre as duas telas (investimento vs patrimonio)
const COPY = {
  investimento: {
    addButton: "Adicionar investimento",
    listHint: "Seus investimentos cadastrados, agrupados por categoria",
    emptyTitle: "Nenhum investimento cadastrado ainda.",
    emptyHint: "Cadastre seus ativos financeiros pra ver o patrimônio e a projeção na Visão geral.",
    editLabel: "Editar investimento",
    deleteLabel: "Excluir investimento",
    deleteTitle: "Excluir investimento",
  },
  patrimonio: {
    addButton: "Adicionar ao patrimônio",
    listHint: "Seus bens cadastrados, agrupados por categoria",
    emptyTitle: "Nenhum item de patrimônio cadastrado ainda.",
    emptyHint: "Cadastre seus bens (imóvel, veículo...) pra compor o patrimônio na Visão geral.",
    editLabel: "Editar item do patrimônio",
    deleteLabel: "Excluir item do patrimônio",
    deleteTitle: "Excluir item do patrimônio",
  },
} as const;

export function InvestmentList({ kind }: { kind: InvestmentKind }) {
  const { data: all, isLoading } = useInvestments();
  const remove = useDeleteInvestment();
  const copy = COPY[kind];
  const EmptyIcon = kind === "patrimonio" ? Landmark : TrendingUp;

  // so os itens do tipo desta tela (kind ausente conta como investimento)
  const investments = all?.filter((i) => investmentKindOf(i) === kind);

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
        <p className="text-sm text-muted">{copy.listHint}</p>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          {copy.addButton}
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted">Carregando...</Card>
      ) : !investments?.length ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <EmptyIcon className="h-8 w-8 text-faint" />
          <p className="text-sm text-muted">{copy.emptyTitle}</p>
          <p className="text-xs text-faint">{copy.emptyHint}</p>
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
                          aria-label={copy.editLabel}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(inv)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                          aria-label={copy.deleteLabel}
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

      <InvestmentFormModal
        isOpen={formOpen}
        onOpenChange={setFormOpen}
        kind={kind}
        investment={editing}
      />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title={copy.deleteTitle}
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa ação não pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
