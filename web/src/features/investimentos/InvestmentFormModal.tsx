import { useEffect, useState, type FormEvent } from "react";
import { Label } from "react-aria-components";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { PercentInput } from "../../components/ui/PercentInput";
import { ComboboxField } from "../../components/ui/Combobox";
import { cn } from "../../lib/cn";
import { categoriesForKind } from "./categories";
import {
  useCreateInvestment,
  useUpdateInvestment,
  type Investment,
  type InvestmentKind,
} from "./investimentos.api";

type InvestmentFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kind: InvestmentKind; // define o tipo do item criado e as categorias sugeridas
  investment?: Investment; // presente = edicao
};

export function InvestmentFormModal({
  isOpen,
  onOpenChange,
  kind,
  investment,
}: InvestmentFormModalProps) {
  const isPatrimony = kind === "patrimonio";
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [value, setValue] = useState(0);
  const [expectedReturnPct, setExpectedReturnPct] = useState(0);
  const [notes, setNotes] = useState("");
  const create = useCreateInvestment();
  const update = useUpdateInvestment();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // ao abrir, carrega os dados do investimento em edicao (ou zera pra criacao)
  useEffect(() => {
    if (isOpen) {
      setName(investment?.name ?? "");
      setCategory(investment?.category ?? "");
      setValue(investment?.value ?? 0);
      setExpectedReturnPct(investment?.expectedReturnPct ?? 0);
      setNotes(investment?.notes ?? "");
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, investment]);

  const valid = name.trim().length > 0 && category.trim().length > 0 && value > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    const input = {
      // mantem o tipo do item em edicao; na criacao usa o tipo da pagina
      kind: investment?.kind ?? kind,
      name: name.trim(),
      category: category.trim(),
      value,
      // vazio = deixa a IA inferir a rentabilidade pela categoria/notes
      expectedReturnPct: expectedReturnPct !== 0 ? expectedReturnPct : null,
      notes: notes.trim() ? notes.trim() : null,
    };
    const onSuccess = () => onOpenChange(false);
    if (investment) {
      update.mutate({ id: investment.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        investment
          ? isPatrimony
            ? "Editar item do patrimônio"
            : "Editar investimento"
          : isPatrimony
            ? "Adicionar ao patrimônio"
            : "Adicionar investimento"
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Nome"
          placeholder={isPatrimony ? "Ex: Apto Centro, Carro" : "Ex: Tesouro IPCA, Carteira de ações"}
          value={name}
          onChange={setName}
          autoFocus
        />
        <ComboboxField
          label="Categoria"
          options={categoriesForKind(kind)}
          value={category}
          onChange={setCategory}
          placeholder="Escolha ou digite a categoria"
        />
        <MoneyInput label="Valor atual" value={value} onChange={setValue} />
        <PercentInput
          label={
            isPatrimony
              ? "Valorização esperada ao ano (opcional)"
              : "Rentabilidade esperada ao ano (opcional)"
          }
          value={expectedReturnPct}
          onChange={setExpectedReturnPct}
          placeholder="Ex: 8,5"
        />

        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted">Premissas (opcional)</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ex: valoriza ~8%/ano + aluguel 0,5%/mês reinvestido"
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
              "placeholder:text-faint outline-none transition",
              "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
            )}
          />
          <p className="text-xs text-faint">
            Use pra premissas que o percentual não captura — a Mira usa isso na projeção.
          </p>
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
