import { formatBRL, formatPct } from "../../lib/format";
import type { BreakdownItem } from "./data";

// lista ranqueada com barra proporcional (barra relativa ao maior item)
export function BreakdownList({ items }: { items: BreakdownItem[] }) {
  const max = Math.max(...items.map((i) => i.percent));

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.name} className="space-y-1.5">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-heading">{item.name}</span>
            <span className="tnum shrink-0 text-heading">{formatBRL(item.value)}</span>
            <span className="tnum w-12 shrink-0 text-right text-muted">{formatPct(item.percent)}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{ width: `${(item.percent / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
