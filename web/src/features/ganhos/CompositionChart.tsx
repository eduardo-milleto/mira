import { Cell, Pie, PieChart } from "recharts";
import { formatBRL, formatPct } from "../../lib/format";
import { composition, totalThisMonth } from "./data";

export function CompositionChart() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative h-52 w-52 shrink-0">
        <PieChart width={208} height={208}>
          <Pie
            data={composition}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {composition.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted">Total</span>
          <span className="tnum text-xl font-light text-heading">{formatBRL(totalThisMonth)}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {composition.map((slice) => (
          <li key={slice.name} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="flex-1 text-heading">{slice.name}</span>
            <span className="tnum text-heading">{formatBRL(slice.value)}</span>
            <span className="tnum w-12 text-right text-muted">{formatPct(slice.percent)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
