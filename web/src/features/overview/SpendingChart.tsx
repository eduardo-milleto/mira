import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRLCompact } from "../../lib/format";
import { spendingData } from "./data";
import { ChartTooltip } from "./ChartTooltip";

const axisTick = { fill: "rgba(255,255,255,0.4)", fontSize: 12 };

export function SpendingChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={spendingData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisTick}
          width={56}
          tickFormatter={formatBRLCompact}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#22c55e"
          strokeWidth={2.5}
          fill="url(#spend-fill)"
          dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#4ade80", stroke: "#0a0b0a", strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
