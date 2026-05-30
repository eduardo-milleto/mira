import { useState } from "react";
import { CreditCard as CreditCardIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { getBankLogo } from "./bankLogos";
import { CardFormModal } from "./CardFormModal";
import {
  useCreditCards,
  useDeleteCard,
  useUpdateCard,
  type CreditCard,
} from "./gastos.api";

export function CardsTab() {
  const { data: cards, isLoading } = useCreditCards();
  const update = useUpdateCard();
  const remove = useDeleteCard();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | undefined>();
  const [toDelete, setToDelete] = useState<CreditCard | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(card: CreditCard) {
    setEditing(card);
    setFormOpen(true);
  }

  function toggleInclude(card: CreditCard, include: boolean) {
    update.mutate({ id: card.id, input: { includeInMonthly: include } });
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, { onSuccess: () => setToDelete(undefined) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Configure seus cartoes e escolha quais entram no gasto mensal</p>
        <Button onPress={openCreate} className="px-4 py-2.5">
          <Plus className="h-4 w-4" />
          Adicionar cartao
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted">Carregando...</Card>
      ) : !cards?.length ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CreditCardIcon className="h-8 w-8 text-faint" />
          <p className="text-sm text-muted">Nenhum cartao cadastrado ainda.</p>
          <p className="text-xs text-faint">Cadastre um cartao e marque para incluir no gasto mensal.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const BankLogo = getBankLogo(card.bank, card.brand);
            return (
            <Card key={card.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                {BankLogo ? (
                  <BankLogo className="h-10 w-10 shrink-0 rounded-xl border border-border" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2">
                    <CreditCardIcon className="h-5 w-5 text-muted" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-heading">{card.name}</p>
                  <p className="truncate text-xs text-faint">
                    {[card.bank, card.brand].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(card)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
                    aria-label="Editar cartao"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(card)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                    aria-label="Excluir cartao"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted">Gasto medio mensal</p>
                <p className="tnum text-lg font-light tracking-tighter text-heading">
                  {formatBRL(card.avgMonthlySpend)}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <Switch
                  isSelected={card.includeInMonthly}
                  onChange={(include) => toggleInclude(card, include)}
                >
                  Incluir no gasto mensal
                </Switch>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <CardFormModal isOpen={formOpen} onOpenChange={setFormOpen} card={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Excluir cartao"
        description={`Tem certeza que deseja excluir "${toDelete?.name}"? Essa acao nao pode ser desfeita.`}
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
