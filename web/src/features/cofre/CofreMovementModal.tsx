import { useEffect, useState, type FormEvent } from "react";
import { Label } from "react-aria-components";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { cn } from "../../lib/cn";
import {
  useCreateMovement,
  useUpdateMovement,
  type CofreMovement,
  type MovementDirection,
} from "./cofre.api";

const toggleBase = "flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition";
const toggleInactive = "text-muted hover:text-heading";
const toggleSelected = "bg-surface-2 text-heading shadow-card";

// data de hoje no fuso local no formato "YYYY-MM-DD" (default do campo de data)
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  movement?: CofreMovement; // presente = edicao
};

export function CofreMovementModal({ isOpen, onOpenChange, movement }: Props) {
  const [direction, setDirection] = useState<MovementDirection>("saida");
  const [amount, setAmount] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [notes, setNotes] = useState("");
  const create = useCreateMovement();
  const update = useUpdateMovement();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // ao abrir, carrega o movimento em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setDirection(movement?.direction ?? "saida");
      setAmount(movement?.amount ?? 0);
      setOccurredAt(movement?.occurredAt ?? todayLocal());
      setNotes(movement?.notes ?? "");
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, movement]);

  const valid = amount > 0 && !!occurredAt;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const base = { amount, occurredAt, notes: notes.trim() || undefined };
    const onSuccess = () => onOpenChange(false);
    if (movement) {
      update.mutate({ id: movement.id, input: { direction, ...base } }, { onSuccess });
    } else {
      create.mutate({ direction, ...base }, { onSuccess });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={movement ? "Editar movimentação" : "Nova movimentação"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted">Tipo</Label>
          <div
            role="tablist"
            aria-label="Tipo de movimentação"
            className="flex gap-1 rounded-xl border border-border bg-surface/60 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={direction === "entrada"}
              onClick={() => setDirection("entrada")}
              className={cn(toggleBase, direction === "entrada" ? toggleSelected : toggleInactive)}
            >
              Entrada
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={direction === "saida"}
              onClick={() => setDirection("saida")}
              className={cn(toggleBase, direction === "saida" ? toggleSelected : toggleInactive)}
            >
              Saída
            </button>
          </div>
          <p className="text-xs text-faint">
            {direction === "entrada"
              ? "Ajuste que aumenta o saldo do cofre."
              : "Gasto extra que sai do cofre."}
          </p>
        </div>

        <MoneyInput label="Valor" value={amount} onChange={setAmount} />

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
          placeholder={direction === "entrada" ? "Ex: dinheiro guardado" : "Ex: conserto do carro"}
          value={notes}
          onChange={setNotes}
        />

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
