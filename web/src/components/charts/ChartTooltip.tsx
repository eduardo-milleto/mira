import type { TooltipProps } from "recharts";
import { formatBRL } from "../../lib/format";

// tooltip compartilhado dos graficos, no estilo dark do app
export function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (typeof value !== "number") return null;

  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 shadow-card">
      <span className="tnum text-sm text-heading">{formatBRL(value)}</span>
    </div>
  );
}
