import { Receipt } from "lucide-react";
import { formatBRL, formatPct } from "../../lib/format";
import type { SpendingSlice } from "./spending";

export function TopSpending({ items }: { items: SpendingSlice[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-3 text-sm">
          <span className="tnum w-4 text-center text-faint">{i + 1}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-negative">
            <Receipt className="h-4 w-4" />
          </span>
          <span className="flex-1 text-heading">{item.name}</span>
          <span className="tnum text-heading">{formatBRL(item.value)}</span>
          <span className="tnum w-12 text-right text-muted">{formatPct(item.percent)}</span>
        </li>
      ))}
    </ul>
  );
}
