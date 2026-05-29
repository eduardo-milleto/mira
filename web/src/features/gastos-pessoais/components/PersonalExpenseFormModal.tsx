import { useEffect, useState, type FormEvent } from "react";
import { Label } from "react-aria-components";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { MoneyInput } from "../../../components/ui/MoneyInput";
import { ComboboxField } from "../../../components/ui/Combobox";
import { cn } from "../../../lib/cn";
import { PERSONAL_CATEGORIES } from "../categories";
import {
  useCreatePersonalExpense,
  useUpdatePersonalExpense,
  type PersonalExpense,
} from "../personal.api";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: PersonalExpense; // presente = edicao
};

// data de hoje no fuso local no formato "YYYY-MM-DD" (default do campo de data)
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function PersonalExpenseFormModal({ isOpen, onOpenChange, expense }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [spentAt, setSpentAt] = useState(todayLocal());
  const create = useCreatePersonalExpense();
  const update = useUpdatePersonalExpense();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // ao abrir, carrega os dados do gasto em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setName(expense?.name ?? "");
      setCategory(expense?.category ?? "");
      setAmount(expense?.amount ?? 0);
      setSpentAt(expense?.spentAt ?? todayLocal());
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expense]);

  const valid = name.trim().length > 0 && category.trim().length > 0 && amount > 0 && !!spentAt;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = { name: name.trim(), category: category.trim(), amount, spentAt };
    const onSuccess = () => onOpenChange(false);
    if (expense) {
      update.mutate({ id: expense.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={expense ? "Editar gasto" : "Adicionar gasto pessoal"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField label="Nome" placeholder="Ex: iFood, tênis novo" value={name} onChange={setName} autoFocus />
        <ComboboxField
          label="Categoria"
          options={PERSONAL_CATEGORIES}
          value={category}
          onChange={setCategory}
          placeholder="Escolha ou digite"
        />
        <MoneyInput label="Valor" value={amount} onChange={setAmount} />

        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted">Data</Label>
          <input
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            className={cn(
              "tnum w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
              "outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
              "[color-scheme:dark]",
            )}
          />
        </div>

        {error && <p className="text-sm text-negative">{error.message}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="ghost" onPress={() => onOpenChange(false)} isDisabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" isPending={pending} isDisabled={!valid || pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
