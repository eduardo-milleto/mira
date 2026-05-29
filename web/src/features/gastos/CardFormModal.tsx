import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { ComboboxField } from "../../components/ui/Combobox";
import { Switch } from "../../components/ui/Switch";
import { BANKS } from "./banks";
import { useCreateCard, useUpdateCard, type CreditCard } from "./gastos.api";

type CardFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard; // presente = edicao
};

export function CardFormModal({ isOpen, onOpenChange, card }: CardFormModalProps) {
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [avgMonthlySpend, setAvgMonthlySpend] = useState(0);
  const [includeInMonthly, setIncludeInMonthly] = useState(false);
  const create = useCreateCard();
  const update = useUpdateCard();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  useEffect(() => {
    if (isOpen) {
      setName(card?.name ?? "");
      setBank(card?.bank ?? "");
      setAvgMonthlySpend(card?.avgMonthlySpend ?? 0);
      setIncludeInMonthly(card?.includeInMonthly ?? false);
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, card]);

  const valid = name.trim().length > 0 && bank.trim().length > 0 && avgMonthlySpend > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = { name: name.trim(), bank: bank.trim(), avgMonthlySpend, includeInMonthly };
    const onSuccess = () => onOpenChange(false);
    if (card) {
      update.mutate({ id: card.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title={card ? "Editar cartao" : "Adicionar cartao"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Apelido do cartao"
          placeholder="Ex: Nubank Roxinho"
          value={name}
          onChange={setName}
          autoFocus
        />
        <ComboboxField
          label="Banco"
          options={BANKS}
          value={bank}
          onChange={setBank}
          placeholder="Escolha ou digite o banco"
        />
        <MoneyInput label="Gasto medio mensal" value={avgMonthlySpend} onChange={setAvgMonthlySpend} />

        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
          <Switch isSelected={includeInMonthly} onChange={setIncludeInMonthly}>
            <span className="flex flex-col">
              <span className="text-heading">Incluir no gasto mensal</span>
              <span className="text-xs text-faint">Soma o valor medio deste cartao no seu gasto do mes</span>
            </span>
          </Switch>
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
