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
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// renda que ja esta vigente vs renda que so comeca num ano futuro (campo startYear)
export function ActiveVsFuture({ active, future }: { active: Item; future: Item }) {
  return (
    <div className="flex gap-6">
      <Column label="Ativa agora" {...active} />
      <Column label="Futura" {...future} />
    </div>
  );
}
