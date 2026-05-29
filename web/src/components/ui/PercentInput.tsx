import { useEffect, useState } from "react";
import { TextField as AriaTextField, Input, Label } from "react-aria-components";
import { cn } from "../../lib/cn";

type PercentInputProps = {
  label: string;
  value: number; // em pontos percentuais (ex: 8.5 = 8,5%)
  onChange: (value: number) => void;
  placeholder?: string;
};

// number -> texto pt-BR sem zeros a toa: 8.5 -> "8,5", 0 -> ""
function toText(v: number): string {
  if (!v) return "";
  return String(v).replace(".", ",");
}

function parseText(t: string): number {
  const n = Number.parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// input de percentual: o usuario digita o numero (com virgula opcional) e mostramos "%".
// guarda o texto local pra permitir estados intermediarios (ex: "8," enquanto digita).
export function PercentInput({ label, value, onChange, placeholder = "0%" }: PercentInputProps) {
  const [text, setText] = useState(() => toText(value));

  // ressincroniza quando o valor externo muda (abrir modal em edicao / reset do form)
  useEffect(() => {
    setText((prev) => (parseText(prev) === value ? prev : toText(value)));
  }, [value]);

  function handleChange(raw: string) {
    // mantem so digitos e separador; normaliza ponto -> virgula e remove virgulas extras
    let cleaned = raw.replace(/[^\d.,]/g, "").replace(/\./g, ",");
    const firstComma = cleaned.indexOf(",");
    if (firstComma !== -1) {
      cleaned =
        cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
    }
    setText(cleaned);
    onChange(parseText(cleaned));
  }

  return (
    <AriaTextField value={text} onChange={handleChange} className="flex flex-col gap-2">
      <Label className="text-sm text-muted">{label}</Label>
      <div className="relative">
        <Input
          inputMode="decimal"
          placeholder={placeholder}
          className={cn(
            "tnum w-full rounded-xl border border-border bg-surface-2 px-4 py-3 pr-9 text-sm text-heading",
            "placeholder:text-faint outline-none transition",
            "data-[focused]:border-brand/60 data-[focused]:ring-2 data-[focused]:ring-brand/20",
          )}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">
          %
        </span>
      </div>
    </AriaTextField>
  );
}
