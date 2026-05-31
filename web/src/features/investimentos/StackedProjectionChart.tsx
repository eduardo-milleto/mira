import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatBRL, formatBRLCompact } from "../../lib/format";
import { assetShade, type ProjectionAsset, type ProjectionRow } from "./projection";

const axisTick = { fill: "rgba(255,255,255,0.4)", fontSize: 12 };

// tooltip que abre a composicao do ano: cada investimento com seu tom da pilha + valor projetado,
// ordenado do maior pro menor, e o total em destaque no topo. e a leitura completa do ponto.
function StackedTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  // a linha do total tambem entra no payload (dataKey "total"); fica de fora da lista de ativos
  const assets = payload
    .filter((p) => p.dataKey !== "total" && typeof p.value === "number" && p.value > 0)
    .sort((a, b) => (b.value as number) - (a.value as number));
  const total = (payload[0]?.payload as ProjectionRow | undefined)?.total ?? 0;

  return (
    <div className="min-w-52 rounded-2xl border border-white/10 bg-surface-2/90 p-3 shadow-card backdrop-blur">
      <div className="flex items-baseline justify-between gap-6 border-b border-white/10 pb-2">
        <span className="text-xs text-muted">{label}</span>
        <span className="tnum text-sm font-medium text-heading">{formatBRL(total)}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {assets.map((p) => (
          <li key={p.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate text-xs text-muted">{p.name}</span>
            </span>
            <span className="tnum shrink-0 text-xs text-heading">
              {formatBRL(p.value as number)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type StackedProjectionChartProps = {
  rows: ProjectionRow[];
  assets: ProjectionAsset[];
};

export function StackedProjectionChart({ rows, assets }: StackedProjectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisTick}
          width={68}
          tickFormatter={formatBRLCompact}
        />
        <Tooltip content={<StackedTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        {assets.map((a, i) => (
          <Bar
            key={a.key}
            dataKey={a.key}
            name={a.name}
            stackId="patrimonio"
            fill={assetShade(i)}
            // so o ativo do topo da pilha arredonda a ponta da barra
            radius={i === assets.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
            barSize={32}
          />
        ))}
        {/* linha pontilhada ligando o total de cada ano, pra leitura da tendencia */}
        <Line
          type="monotone"
          dataKey="total"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
