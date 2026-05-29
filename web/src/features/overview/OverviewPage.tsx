import { Info } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { FeatureCard } from "../../components/FeatureCard";
import { formatBRL } from "../../lib/format";
import { useSession } from "../auth/auth.api";
import { HeroCard } from "./HeroCard";
import { ProjectionChart } from "./ProjectionChart";
import { BreakdownList } from "./BreakdownList";
import { useInsights } from "./insights.api";
import {
  assetBreakdown,
  featureLinks,
  monthlyIncome,
  monthlySpending,
  netWorth,
  spendingBreakdown,
} from "./data";

function CardHeader({ title, period }: { title: string; period?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        {title} <Info className="h-3.5 w-3.5 text-faint" />
      </p>
      {period && <span className="shrink-0 text-sm text-muted">{period}</span>}
    </div>
  );
}

export function OverviewPage() {
  const { data: user } = useSession();
  const insights = useInsights(
    { monthlyIncome, monthlyExpenses: monthlySpending, netWorth },
    !!user,
  );

  const projection = insights.data?.projection5y ?? [];
  const first = projection[0]?.value;
  const last = projection[projection.length - 1]?.value;
  const growth = first && last ? Math.round((last / first - 1) * 100) : null;
  const span = projection.length > 1 ? projection.length - 1 : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <HeroCard userName={user?.name ?? ""} insights={insights.data} loading={insights.isLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Gastos mensais" period="Este mês" />
          <p className="tnum mt-2 text-3xl font-light tracking-tighter text-heading">
            {formatBRL(monthlySpending)}
          </p>
          <div className="mt-5">
            <BreakdownList items={spendingBreakdown} />
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Patrimônio" period="Atual" />
          <p className="tnum mt-2 text-3xl font-light tracking-tighter text-heading">
            {formatBRL(netWorth)}
          </p>
          <div className="mt-5">
            <BreakdownList items={assetBreakdown} />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader title="Projeções anuais" period="Anual" />
        {insights.isLoading ? (
          <p className="mt-2 text-sm text-muted">Calculando projeção...</p>
        ) : projection.length ? (
          <>
            <div className="mt-2 flex items-center gap-3">
              <p className="tnum text-3xl font-light tracking-tighter text-heading">
                {formatBRL(last ?? 0)}
              </p>
              {growth !== null && (
                <span className="tnum rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                  +{growth}% em {span} anos
                </span>
              )}
            </div>
            <div className="mt-4">
              <ProjectionChart data={projection} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Projeção indisponível no momento.</p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {featureLinks.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </div>
  );
}
