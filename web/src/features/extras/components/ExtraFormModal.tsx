import { useEffect, useState, type FormEvent } from "react";
import { Label } from "react-aria-components";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { MoneyInput } from "../../../components/ui/MoneyInput";
import { ComboboxField } from "../../../components/ui/Combobox";
import { cn } from "../../../lib/cn";
import { EXTRA_GANHO_CATEGORIES, EXTRA_GASTO_CATEGORIES } from "../categories";
import { useCreateExtra, useUpdateExtra, type Extra, type ExtraKind } from "../extras.api";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ExtraKind; // view ativa (ganho/gasto) — define o tipo ao criar
  extra?: Extra; // presente = edicao
};

// data de hoje no fuso local no formato "YYYY-MM-DD" (default do campo de data)
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function ExtraFormModal({ isOpen, onOpenChange, kind, extra }: Props) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const create = useCreateExtra();
  const update = useUpdateExtra();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // tipo efetivo: na edicao mantem o do lancamento; na criacao usa a view ativa
  const effectiveKind = extra?.kind ?? kind;
  const isGanho = effectiveKind === "ganho";
  const categories = isGanho ? EXTRA_GANHO_CATEGORIES : EXTRA_GASTO_CATEGORIES;
  const noun = isGanho ? "ganho extra" : "gasto extra";

  // ao abrir, carrega os dados do extra em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setDescription(extra?.description ?? "");
      setCategory(extra?.category ?? "");
      setAmount(extra?.amount ?? 0);
      setOccurredAt(extra?.occurredAt ?? todayLocal());
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, extra]);

  const valid = description.trim().length > 0 && amount > 0 && !!occurredAt;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const base = {
      description: description.trim(),
      category: category.trim() || undefined,
      amount,
      occurredAt,
    };
    const onSuccess = () => onOpenChange(false);
    if (extra) {
      update.mutate({ id: extra.id, input: base }, { onSuccess });
    } else {
      create.mutate({ kind: effectiveKind, ...base }, { onSuccess });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={extra ? `Editar ${noun}` : `Adicionar ${noun}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Descrição"
          placeholder={isGanho ? "Ex: bônus, freela, venda" : "Ex: conserto, viagem, imposto"}
          value={description}
          onChange={setDescription}
          autoFocus
        />
        <ComboboxField
          label="Categoria (opcional)"
          options={categories}
          value={category}
          onChange={setCategory}
          placeholder="Escolha ou digite"
        />
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
