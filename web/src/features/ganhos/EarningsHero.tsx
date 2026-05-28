import { BarChart3, CalendarDays, Flame, Info, Target, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatBRL } from "../../lib/format";
import { monthStats, totalThisMonth } from "./data";

const statIcons: LucideIcon[] = [CalendarDays, BarChart3, Flame, Target];

export function EarningsHero() {
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

      <div className="relative p-8">
        <h1 className="text-3xl font-light tracking-tighter">
          Seus ganhos estão <span className="text-brand">evoluindo.</span>
        </h1>

        <div className="mt-6 grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <p className="max-w-xs text-sm font-light text-muted">
            Você teve um mês excelente. Seus ganhos cresceram e sua consistência está impulsionando
            seu patrimônio para o futuro.
          </p>

          {/* card de ganhos totais */}
          <div className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur">
            <p className="flex items-center gap-2 text-sm text-muted">
              Ganhos totais este mês <Info className="h-3.5 w-3.5 text-faint" />
            </p>
            <div className="mt-2 flex items-center gap-6">
              <div>
                <p className="tnum text-4xl font-light tracking-tighter text-heading">
                  {formatBRL(totalThisMonth)}
                </p>
                <p className="tnum mt-1 flex items-center gap-1 text-sm text-positive">
                  <TrendingUp className="h-4 w-4" />+ 28,6% vs mês anterior
                </p>
                <p className="tnum mt-1 text-xs text-faint">{formatBRL(4086)} a mais</p>
              </div>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-brand/40 text-brand shadow-glow">
                <TrendingUp className="h-7 w-7" />
              </span>
            </div>
          </div>

          {/* 4 tiles de estatistica */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            {monthStats.map((stat, i) => {
              const Icon = statIcons[i];
              return (
                <div key={stat.label} className="flex flex-col items-center gap-1.5 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-xs text-muted">{stat.label}</p>
                  <p className="tnum text-lg font-light text-heading">{stat.value}</p>
                  <p className={`tnum text-xs ${stat.subPositive ? "text-positive" : "text-faint"}`}>
                    {stat.sub}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
