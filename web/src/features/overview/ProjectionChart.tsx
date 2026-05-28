import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRLCompact } from "../../lib/format";
import { projectionData } from "./data";
import { ChartTooltip } from "../../components/charts/ChartTooltip";

const axisTick = { fill: "rgba(255,255,255,0.4)", fontSize: 12 };

export function ProjectionChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={projectionData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisTick}
          width={68}
          tickFormatter={formatBRLCompact}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" fill="url(#bar-fill)" radius={[6, 6, 0, 0]} barSize={28} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#4ade80"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3, fill: "#4ade80", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
