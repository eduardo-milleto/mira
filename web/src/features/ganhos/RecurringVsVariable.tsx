import { TrendingUp } from "lucide-react";
import { formatBRL, formatPct } from "../../lib/format";
import { recurring, variable } from "./data";

type Item = { label: string; value: number; percent: number; delta: number };

function Column({ label, value, percent, delta }: Item) {
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
    <div className="flex gap-6">
      <Column label="Recorrente" {...recurring} />
      <Column label="Variável" {...variable} />
    </div>
  );
}
