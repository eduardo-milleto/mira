import { useEffect, useState, type FormEvent } from "react";
import { Label } from "react-aria-components";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { cn } from "../../lib/cn";
import {
  useCreateInvestmentEvent,
  type Investment,
  type InvestmentEventInput,
} from "./investimentos.api";

type EventType = InvestmentEventInput["type"];

// tipos de evento por categoria do ativo
const TYPE_OPTIONS: Record<string, { value: EventType; label: string }[]> = {
  investimento: [
    { value: "aporte", label: "Aporte" },
    { value: "rendimento", label: "Rendimento" },
    { value: "resgate", label: "Resgate" },
  ],
  patrimonio: [
    { value: "valorizacao", label: "Valorização" },
    { value: "depreciacao", label: "Depreciação" },
  ],
};

const HINT: Record<EventType, string> = {
  aporte: "Dinheiro que você colocou — sai do cofre.",
  rendimento: "Quanto o ativo rendeu ou caiu sozinho (mercado).",
  resgate: "Dinheiro que você tirou — volta pro cofre.",
  valorizacao: "O bem passou a valer mais.",
  depreciacao: "O bem passou a valer menos.",
};

const toggleBase = "flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm outline-none transition";
const toggleInactive = "text-muted hover:text-heading";
const toggleSelected = "bg-surface-2 text-heading shadow-card";

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// aporte/resgate pedem o valor movimentado; os demais pedem o novo valor total do ativo
function isAmountType(type: EventType): boolean {
  return type === "aporte" || type === "resgate";
}

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment;
};

export function InvestmentEventModal({ isOpen, onOpenChange, investment }: Props) {
  const kind = investment.kind ?? "investimento";
  const options = TYPE_OPTIONS[kind] ?? TYPE_OPTIONS.investimento;
  const current = investment.value;

  const [type, setType] = useState<EventType>(options[0].value);
  const [value, setValue] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [notes, setNotes] = useState("");
  const create = useCreateInvestmentEvent();

  // troca de tipo redefine o valor padrao: movimento (0) ou novo total (valor atual)
  function selectType(next: EventType) {
    setType(next);
    setValue(isAmountType(next) ? 0 : current);
  }

  // ao abrir, volta pro 1o tipo e zera os campos
  useEffect(() => {
    if (isOpen) {
      const first = options[0].value;
      setType(first);
      setValue(isAmountType(first) ? 0 : current);
      setOccurredAt(todayLocal());
      setNotes("");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, investment.id]);

  const amountMode = isAmountType(type);
  // movimento: precisa ser > 0. novo total: precisa ser diferente do valor atual
  const valid = amountMode ? value > 0 : value !== current;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || create.isPending) return;
    create.mutate(
      {
        investmentId: investment.id,
        input: { type, value, occurredAt, notes: notes.trim() || undefined },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title={`Movimentar — ${investment.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted">Tipo</Label>
          <div
            role="tablist"
            aria-label="Tipo de movimentação"
            className="flex gap-1 rounded-xl border border-border bg-surface/60 p-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={type === opt.value}
                onClick={() => selectType(opt.value)}
                className={cn(toggleBase, type === opt.value ? toggleSelected : toggleInactive)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-faint">{HINT[type]}</p>
        </div>

        <MoneyInput
          label={
            amountMode
              ? type === "aporte"
                ? "Quanto você aportou?"
                : "Quanto você resgatou?"
              : "Novo valor atual do ativo"
          }
          value={value}
          onChange={setValue}
        />

        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted">Data</Label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={cn(
              "tnum w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
              "outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
              "[color-scheme:dark]",
            )}
          />
        </div>

        <TextField
          label="Descrição (opcional)"
          placeholder="Ex: aporte mensal, dividendos, reforma"
          value={notes}
          onChange={setNotes}
        />

        {create.error && <p className="text-sm text-negative">{create.error.message}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="ghost" onPress={() => onOpenChange(false)} isDisabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" isPending={create.isPending} isDisabled={!valid || create.isPending}>
            {create.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
