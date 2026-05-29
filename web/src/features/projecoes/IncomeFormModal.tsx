import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { PercentInput } from "../../components/ui/PercentInput";
import { ComboboxField } from "../../components/ui/Combobox";
import { Switch } from "../../components/ui/Switch";
import { useCreateIncome, useUpdateIncome, type IncomeSource } from "./projecoes.api";

type IncomeFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  income?: IncomeSource; // presente = edicao
};

// anos disponiveis pra uma renda futura: do proximo ano ate +20
const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_YEARS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 + i));

export function IncomeFormModal({ isOpen, onOpenChange, income }: IncomeFormModalProps) {
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [annualGrowthPct, setAnnualGrowthPct] = useState(0);
  const [isFuture, setIsFuture] = useState(false);
  const [startYear, setStartYear] = useState("");
  const create = useCreateIncome();
  const update = useUpdateIncome();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // ao abrir, carrega os dados da fonte em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setName(income?.name ?? "");
      setMonthlyAmount(income?.monthlyAmount ?? 0);
      setAnnualGrowthPct(income?.annualGrowthPct ?? 0);
      const future = income?.startYear != null && income.startYear > CURRENT_YEAR;
      setIsFuture(future);
      setStartYear(future ? String(income?.startYear) : "");
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, income]);

  const yearNum = Number.parseInt(startYear, 10);
  const yearValid = !isFuture || (Number.isInteger(yearNum) && yearNum > CURRENT_YEAR);
  const valid = name.trim().length > 0 && monthlyAmount > 0 && yearValid;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = {
      name: name.trim(),
      monthlyAmount,
      annualGrowthPct,
      startYear: isFuture ? yearNum : null,
    };
    const onSuccess = () => onOpenChange(false);
    if (income) {
      update.mutate({ id: income.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={income ? "Editar fonte de renda" : "Adicionar fonte de renda"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField label="Nome" placeholder="Ex: Salário" value={name} onChange={setName} autoFocus />
        <MoneyInput label="Valor mensal" value={monthlyAmount} onChange={setMonthlyAmount} />
        <PercentInput
          label="Crescimento esperado ao ano"
          value={annualGrowthPct}
          onChange={setAnnualGrowthPct}
        />

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2/50 p-4">
          <Switch isSelected={isFuture} onChange={setIsFuture}>
            Renda futura (ainda não começou)
          </Switch>
          {isFuture && (
            <ComboboxField
              label="Começa em"
              options={FUTURE_YEARS}
              value={startYear}
              onChange={setStartYear}
              placeholder="Ano de início"
            />
          )}
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
