import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
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

// anos disponiveis pra rendas futuras / valores futuros: do proximo ano ate +30
const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR + 1 + i));

// linha de "valor futuro": ano (texto, pro combobox) + valor mensal
type StepRow = { year: string; monthlyAmount: number };

export function IncomeFormModal({ isOpen, onOpenChange, income }: IncomeFormModalProps) {
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [annualGrowthPct, setAnnualGrowthPct] = useState(0);
  const [isFuture, setIsFuture] = useState(false);
  const [startYear, setStartYear] = useState("");
  const [steps, setSteps] = useState<StepRow[]>([]);
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
      setSteps((income?.steps ?? []).map((s) => ({ year: String(s.year), monthlyAmount: s.monthlyAmount })));
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, income]);

  function addStep() {
    setSteps((prev) => [...prev, { year: "", monthlyAmount: 0 }]);
  }
  function updateStep(idx: number, patch: Partial<StepRow>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  const yearNum = Number.parseInt(startYear, 10);
  const yearValid = !isFuture || (Number.isInteger(yearNum) && yearNum > CURRENT_YEAR);

  // cada valor futuro precisa de ano valido (futuro) + valor > 0, e anos nao podem repetir
  const stepRows = steps.map((s) => ({ ...s, yearNum: Number.parseInt(s.year, 10) }));
  const stepsFilled = stepRows.every(
    (s) => Number.isInteger(s.yearNum) && s.yearNum > CURRENT_YEAR && s.monthlyAmount > 0,
  );
  const stepYears = stepRows.map((s) => s.yearNum);
  const noDupYears = new Set(stepYears).size === stepYears.length;
  const stepsValid = stepsFilled && noDupYears;

  const valid = name.trim().length > 0 && monthlyAmount > 0 && yearValid && stepsValid;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = {
      name: name.trim(),
      monthlyAmount,
      annualGrowthPct,
      startYear: isFuture ? yearNum : null,
      steps: stepRows.map((s) => ({ year: s.yearNum, monthlyAmount: s.monthlyAmount })),
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
          label="Crescimento esperado ao ano (opcional)"
          value={annualGrowthPct}
          onChange={setAnnualGrowthPct}
          placeholder="Ex: 8,5"
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

        {/* valores futuros por ano: sobrescrevem o crescimento percentual naquele ano */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2/50 p-4">
          <div>
            <p className="text-sm text-heading">Valores futuros por ano (opcional)</p>
            <p className="text-xs text-faint">
              Defina quanto essa renda passa a valer em anos específicos — sobrescreve o crescimento
              naquele ano.
            </p>
          </div>

          {steps.length > 0 && (
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-surface/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Valor {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
                      aria-label="Remover valor futuro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <ComboboxField
                      label="Ano"
                      options={FUTURE_YEARS}
                      value={step.year}
                      onChange={(year) => updateStep(idx, { year })}
                      placeholder="Ano"
                    />
                    <MoneyInput
                      label="Novo valor mensal"
                      value={step.monthlyAmount}
                      onChange={(monthlyAmount) => updateStep(idx, { monthlyAmount })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!noDupYears && <p className="text-xs text-negative">Há anos repetidos nos valores futuros.</p>}

          <Button variant="outline" onPress={addStep} className="self-start px-3 py-2 text-sm">
            <Plus className="h-4 w-4" />
            Adicionar ano
          </Button>
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
