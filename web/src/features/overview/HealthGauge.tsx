type HealthGaugeProps = {
  value?: number;
  label?: string;
  loading?: boolean;
};

const RADIUS = 88;
const CIRC = 2 * Math.PI * RADIUS;

// medidor circular da saude financeira (arco verde com glow sobre trilho fraco)
export function HealthGauge({ value, label, loading }: HealthGaugeProps) {
  const hasValue = typeof value === "number";
  const arc = hasValue ? (CIRC * Math.min(Math.max(value, 0), 100)) / 100 : 0;

  // texto central conforme estado: numero, "..." (calculando) ou "—" (indisponivel)
  const centerValue = hasValue ? `${Math.round(value)}%` : loading ? "..." : "—";
  const centerLabel = hasValue ? (label ?? "") : loading ? "Calculando..." : "Indisponível";

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="12"
        />
        {hasValue && (
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="url(#gauge-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            style={{ filter: "drop-shadow(0 0 8px rgba(34,197,94,0.6))" }}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-sm text-muted">Saúde financeira</span>
        <span className="tnum text-5xl font-light tracking-tighter text-heading">{centerValue}</span>
        <span className="text-lg font-light text-brand">{centerLabel}</span>
      </div>
    </div>
  );
}
