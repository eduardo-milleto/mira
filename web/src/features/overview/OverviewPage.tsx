import { Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "../../components/ui/Card";
import { FeatureCard } from "../../components/FeatureCard";
import { formatBRL } from "../../lib/format";
import { useSession } from "../auth/auth.api";
import { useCreditCards, useExpenses } from "../gastos/gastos.api";
import { buildSpending } from "../gastos/spending";
import { investmentKindOf, useInvestments } from "../investimentos/investimentos.api";
import { buildPatrimony } from "../investimentos/patrimony";
import { usePersonalSummary } from "../gastos-pessoais/personal.api";
import { HeroCard } from "./HeroCard";
import { ProjectionChart } from "./ProjectionChart";
import { BreakdownList } from "./BreakdownList";
import { useInsightsData } from "./insights.api";
import { featureLinks } from "./data";

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

// uma das duas partes do patrimonio (Investimentos / Patrimonio) com subtotal + breakdown
function PatrimonySection({
  label,
  total,
  items,
}: {
  label: string;
  total: number;
  items: { name: string; value: number; percent: number }[];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
        <span className="tnum text-sm text-muted">{formatBRL(total)}</span>
      </div>
      <div className="mt-3">
        <BreakdownList items={items} />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { data: user } = useSession();
  const expensesQuery = useExpenses(!!user);
  const cardsQuery = useCreditCards(!!user);
  const personalQuery = usePersonalSummary(!!user);
  const spendingLoading = expensesQuery.isLoading || cardsQuery.isLoading || personalQuery.isLoading;
  const spending = buildSpending(
    expensesQuery.data ?? [],
    cardsQuery.data ?? [],
    personalQuery.data?.monthTotal ?? 0,
  );

  const investmentsQuery = useInvestments(!!user);
  const allAssets = investmentsQuery.data ?? [];
  const patrimony = buildPatrimony(allAssets); // total geral (patrimonio + investimentos)
  // duas seccoes: investimentos (kind ausente conta aqui) e patrimonio (bens)
  const investSection = buildPatrimony(allAssets.filter((i) => investmentKindOf(i) === "investimento"));
  const bensSection = buildPatrimony(allAssets.filter((i) => investmentKindOf(i) === "patrimonio"));

  // mesma fonte de insights da Sugestoes IA e Projecoes (renda das fontes + premissas + gasto real)
  const insights = useInsightsData();

  const projection = insights.data?.projection ?? [];
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
            {formatBRL(spending.total)}
          </p>
          <div className="mt-5">
            {spendingLoading ? (
              <p className="text-sm text-muted">Carregando...</p>
            ) : spending.items.length ? (
              <BreakdownList items={spending.items} />
            ) : (
              <p className="text-sm text-muted">
                Nenhum gasto cadastrado.{" "}
                <Link to="/gastos" className="text-brand transition hover:text-brand-dark">
                  Adicionar gastos
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Patrimônio" period="Atual" />
          <p className="tnum mt-2 text-3xl font-light tracking-tighter text-heading">
            {formatBRL(patrimony.total)}
          </p>
          <div className="mt-5">
            {investmentsQuery.isLoading ? (
              <p className="text-sm text-muted">Carregando...</p>
            ) : patrimony.items.length ? (
              <div className="flex flex-col gap-6">
                {investSection.items.length > 0 && (
                  <PatrimonySection
                    label="Investimentos"
                    total={investSection.total}
                    items={investSection.items}
                  />
                )}
                {bensSection.items.length > 0 && (
                  <PatrimonySection
                    label="Patrimônio"
                    total={bensSection.total}
                    items={bensSection.items}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Nada cadastrado ainda.{" "}
                <Link to="/investimentos" className="text-brand transition hover:text-brand-dark">
                  Adicionar investimentos
                </Link>{" "}
                ou{" "}
                <Link to="/patrimonio" className="text-brand transition hover:text-brand-dark">
                  patrimônio
                </Link>
                .
              </p>
            )}
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
