import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { useCreateExpense, useUpdateExpense, type Expense } from "./gastos.api";

type ExpenseFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense; // presente = edicao
};

export function ExpenseFormModal({ isOpen, onOpenChange, expense }: ExpenseFormModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // ao abrir, carrega os dados do gasto em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setName(expense?.name ?? "");
      setAmount(expense?.amount ?? 0);
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expense]);

  const valid = name.trim().length > 0 && amount > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = { name: name.trim(), amount };
    const onSuccess = () => onOpenChange(false);
    if (expense) {
      update.mutate({ id: expense.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title={expense ? "Editar gasto" : "Adicionar gasto"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Nome"
          placeholder="Ex: Aluguel AP"
          value={name}
          onChange={setName}
          autoFocus
        />
        <MoneyInput label="Valor mensal" value={amount} onChange={setAmount} />

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
