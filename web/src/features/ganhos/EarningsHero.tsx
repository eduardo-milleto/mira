import { Info, TrendingUp } from "lucide-react";
import { formatBRL } from "../../lib/format";

export function EarningsHero({ total }: { total: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src="/mira-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bg/95 via-bg/70 to-bg/85" />

      <div className="relative p-5 sm:p-8">
        <h1 className="text-2xl font-light tracking-tighter sm:text-3xl">
          Seus ganhos <span className="text-brand">em foco.</span>
        </h1>

        <div className="mt-6 grid grid-cols-1 items-center gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
          <p className="max-w-xs text-sm font-light text-muted">
            Aqui está o resumo dos seus ganhos do mês, organizados por fonte de renda.
          </p>

          {/* card de ganhos totais */}
          <div className="rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur sm:p-6">
            <p className="flex items-center gap-2 text-sm text-muted">
              Ganhos totais este mês <Info className="h-3.5 w-3.5 text-faint" />
            </p>
            <div className="mt-2 flex items-center justify-between gap-4 sm:justify-start sm:gap-6">
              <p className="tnum min-w-0 text-3xl font-light tracking-tighter text-heading sm:text-4xl">
                {formatBRL(total)}
              </p>
              <span className="flex h-12 w-12 shrink-0 items-center sm:h-16 sm:w-16 justify-center rounded-full border border-brand/40 text-brand shadow-glow">
                <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
