import { formatBRL, formatPct } from "../../lib/format";

type Item = { value: number; percent: number };

function Column({ label, value, percent }: { label: string } & Item) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="tnum whitespace-nowrap text-2xl font-light tracking-tighter text-heading">
          {formatBRL(value)}
        </p>
        <span className="tnum text-sm text-muted">{formatPct(percent)}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/40" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// gasto recorrente (avulsos + cartoes do mensal) vs gasto pontual do mes (pessoais + extras)
export function SpendingSplit({ fixed, variable }: { fixed: Item; variable: Item }) {
  return (
    <div className="flex gap-6">
      <Column label="Fixos" {...fixed} />
      <Column label="Variáveis" {...variable} />
    </div>
  );
}
