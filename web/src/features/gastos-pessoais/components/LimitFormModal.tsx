import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { MoneyInput } from "../../../components/ui/MoneyInput";
import { ComboboxField } from "../../../components/ui/Combobox";
import { PERSONAL_CATEGORIES } from "../categories";
import { useUpsertLimit, type CategoryLimit } from "../personal.api";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  limit?: CategoryLimit; // presente = edicao (categoria travada)
};

export function LimitFormModal({ isOpen, onOpenChange, limit }: Props) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const upsert = useUpsertLimit();

  useEffect(() => {
    if (isOpen) {
      setCategory(limit?.category ?? "");
      setAmount(limit?.amount ?? 0);
      upsert.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, limit]);

  const valid = category.trim().length > 0 && amount > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || upsert.isPending) return;
    upsert.mutate(
      { category: category.trim(), amount },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={limit ? "Editar limite" : "Definir limite"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {limit ? (
          // na edicao a categoria fica fixa (o limite e unico por categoria)
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Categoria</p>
            <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading">
              {limit.category}
            </p>
          </div>
        ) : (
          <ComboboxField
            label="Categoria"
            options={PERSONAL_CATEGORIES}
            value={category}
            onChange={setCategory}
            placeholder="Escolha ou digite"
          />
        )}
        <MoneyInput label="Limite mensal" value={amount} onChange={setAmount} />

        {upsert.error && <p className="text-sm text-negative">{upsert.error.message}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="ghost" onPress={() => onOpenChange(false)} isDisabled={upsert.isPending}>
            Cancelar
          </Button>
          <Button type="submit" isPending={upsert.isPending} isDisabled={!valid || upsert.isPending}>
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
