import { TextField as AriaTextField, Input, Label } from "react-aria-components";
import { formatBRL } from "../../lib/format";
import { cn } from "../../lib/cn";

type MoneyInputProps = {
  label: string;
  value: number; // em reais
  onChange: (value: number) => void;
  placeholder?: string;
};

// input de moeda no estilo "centavos": o usuario digita numeros e o valor
// vai preenchendo da direita pra esquerda (R$ 0,01 -> R$ 0,12 -> R$ 1,23).
// guarda sempre um number em reais com no maximo 2 casas.
export function MoneyInput({ label, value, onChange, placeholder = "R$ 0,00" }: MoneyInputProps) {
  const display = value > 0 ? formatBRL(value) : "";

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    const cents = digits ? Number.parseInt(digits, 10) : 0;
    onChange(cents / 100);
  }

  return (
    <AriaTextField value={display} onChange={handleChange} className="flex flex-col gap-2">
      <Label className="text-sm text-muted">{label}</Label>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        className={cn(
          "tnum w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
          "placeholder:text-faint outline-none transition",
          "data-[focused]:border-brand/60 data-[focused]:ring-2 data-[focused]:ring-brand/20",
        )}
      />
    </AriaTextField>
  );
}
