import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatBRL, formatPct } from "../../lib/format";

type Props = {
  active: number;
  future: number;
  futureYear: number;
  minYear: number;
  maxYear: number;
  onYearChange: (year: number) => void;
};

// renda vigente hoje vs renda mensal total projetada para um ano futuro
// (fontes atuais crescendo + valores definidos + rendas que comecam ate la)
export function ActiveVsFuture({ active, future, futureYear, minYear, maxYear, onYearChange }: Props) {
  // barras proporcionais ao maior valor pra comunicar visualmente o crescimento
  const max = Math.max(active, future, 1);
  const growth = active > 0 ? (future / active - 1) * 100 : 0;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">Ativa agora</p>
        <p className="tnum mt-2 whitespace-nowrap text-2xl font-light tracking-tighter text-heading">
          {formatBRL(active)}
        </p>
        <Bar pct={(active / max) * 100} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">Futura</p>
          <YearStepper year={futureYear} min={minYear} max={maxYear} onChange={onYearChange} />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="tnum whitespace-nowrap text-2xl font-light tracking-tighter text-heading">
            {formatBRL(future)}
          </p>
          {growth > 0 && <span className="tnum text-sm text-brand">+{formatPct(growth)}</span>}
        </div>
        <Bar pct={(future / max) * 100} />
      </div>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
    </div>
  );
}

function YearStepper({
  year,
  min,
  max,
  onChange,
}: {
  year: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
}) {
  const btn =
    "flex h-6 w-6 items-center justify-center rounded-md text-muted outline-none transition hover:bg-white/5 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-white/5 px-1 py-0.5">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(year - 1)}
        disabled={year <= min}
        aria-label="Ano anterior"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="tnum w-9 text-center text-xs text-heading">{year}</span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(year + 1)}
        disabled={year >= max}
        aria-label="Próximo ano"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
