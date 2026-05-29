import { useLayoutEffect, useRef, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { formatBRL, formatPct } from "../../lib/format";
import type { EarningsSlice } from "./earnings";

const SIZE = 208;
const INNER_RADIUS = 66;
// largura util dentro do furo do anel (diametro do furo com uma folga pras bordas)
const HOLE_WIDTH = INNER_RADIUS * 2 - 16;

// reduz o valor central so quando ele passaria do furo do anel, mantendo o valor
// exato e sem distorcer (escala uniforme). valores curtos ficam no tamanho cheio.
function useFitScale(text: string, maxWidth: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const width = el.scrollWidth;
      setScale(width > maxWidth ? maxWidth / width : 1);
    };
    measure();
    // remede quando a fonte (Inter) terminar de carregar pra medir certo
    document.fonts?.ready.then(measure).catch(() => {});
  }, [text, maxWidth]);

  return { ref, scale };
}

export function CompositionChart({ slices, total }: { slices: EarningsSlice[]; total: number }) {
  const value = formatBRL(total);
  const { ref, scale } = useFitScale(value, HOLE_WIDTH);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative h-52 w-52 shrink-0">
        <PieChart width={SIZE} height={SIZE}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={INNER_RADIUS}
            outerRadius={96}
            paddingAngle={2.5}
            cornerRadius={5}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted">Total</span>
          <span
            ref={ref}
            className="tnum inline-block whitespace-nowrap text-xl font-light text-heading"
            style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: "center" } : undefined}
          >
            {value}
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {slices.map((slice) => (
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
