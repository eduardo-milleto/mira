import { ArrowDown, ChevronDown, Info } from "lucide-react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card } from "../../components/ui/Card";
import { formatBRL } from "../../lib/format";
import { useSession } from "../auth/auth.api";
import { HeroCard } from "./HeroCard";
import { SpendingChart } from "./SpendingChart";
import { ProjectionChart } from "./ProjectionChart";
import { FeatureCard } from "./FeatureCard";
import { featureLinks } from "./data";

// dropdown apenas visual por ora (sem <select> nativo) — vira combobox real quando filtrar de verdade
function PeriodButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted transition hover:text-heading"
    >
      {label}
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}

export function OverviewPage() {
  const { data: user } = useSession();

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <HeroCard userName={user?.name ?? ""} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm text-muted">
                  Gastos mensais <Info className="h-3.5 w-3.5 text-faint" />
                </p>
                <p className="tnum mt-2 text-3xl font-light tracking-tighter text-heading">
                  {formatBRL(4389.6)}
                </p>
                <p className="tnum mt-1 flex items-center gap-1 text-xs text-positive">
                  <ArrowDown className="h-3 w-3" />
                  8,2% vs mês anterior
                </p>
              </div>
              <PeriodButton label="Este mês" />
            </div>
            <div className="mt-4">
              <SpendingChart />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm text-muted">
                  Projeções anuais <Info className="h-3.5 w-3.5 text-faint" />
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="tnum text-3xl font-light tracking-tighter text-heading">
                    {formatBRL(136780)}
                  </p>
                  <span className="tnum rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                    +42% em 5 anos
                  </span>
                </div>
              </div>
              <PeriodButton label="Anual" />
            </div>
            <div className="mt-4">
              <ProjectionChart />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {featureLinks.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
