import { TrendingUp } from "lucide-react";
import { formatBRL, formatPct } from "../../lib/format";
import { recurring, variable } from "./data";

type Item = { label: string; value: number; percent: number; delta: number };

function Column({ label, value, percent, delta }: Item) {
  return (
    <div className="flex-1">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="tnum text-2xl font-light tracking-tighter text-heading">{formatBRL(value)}</p>
        <span className="tnum text-sm text-muted">{formatPct(percent)}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${percent}%` }} />
      </div>
      <p className="tnum mt-3 flex items-center gap-1 text-xs text-positive">
        <TrendingUp className="h-3 w-3" />
        {formatPct(delta)} vs mês anterior
      </p>
    </div>
  );
}

export function RecurringVsVariable() {
  return (
    <div className="flex gap-8">
      <Column label="Recorrente" {...recurring} />
      <Column label="Variável" {...variable} />
    </div>
  );
}
