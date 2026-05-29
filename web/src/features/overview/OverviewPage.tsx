import { useState } from "react";
import { Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "../../components/ui/Card";
import { MonthSelect } from "../../components/ui/MonthSelect";
import { FeatureCard } from "../../components/FeatureCard";
import { formatBRL, formatPct } from "../../lib/format";
import { cn } from "../../lib/cn";
import { currentMonthKey, monthLabel } from "../../lib/month";
import { useSession } from "../auth/auth.api";
import { useCreditCards, useExpenses } from "../gastos/gastos.api";
import { buildSpending } from "../gastos/spending";
import { useIncomes } from "../projecoes/projecoes.api";
import { buildEarnings } from "../ganhos/earnings";
import { investmentKindOf, useInvestments } from "../investimentos/investimentos.api";
import { buildPatrimony, expectedMonthlyVariationPct } from "../investimentos/patrimony";
import { usePersonalSummary } from "../gastos-pessoais/personal.api";
import { useExtrasSummary } from "../extras/extras.api";
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

// uma das duas partes do patrimonio (Investimentos / Patrimonio) com subtotal + breakdown.
// expectedPct = variacao mensal ESPERADA (estimativa) pela taxa de rendimento dos ativos.
function PatrimonySection({
  label,
  total,
  items,
  expectedPct,
}: {
  label: string;
  total: number;
  items: { name: string; value: number; percent: number }[];
  expectedPct?: number;
}) {
  // so mostra a badge quando ha taxa relevante (arredonda pra >= 0,1%); evita "+0,0%/mês"
  const showPct = expectedPct != null && Math.abs(expectedPct) >= 0.05;
  const up = (expectedPct ?? 0) >= 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
        <span className="flex items-baseline gap-2">
          {showPct && (
            <span
              title="Variação mensal esperada pela taxa de rendimento de cada ativo"
              className={cn(
                "tnum rounded-full px-2 py-0.5 text-xs",
                up ? "bg-brand-soft text-brand" : "bg-negative/10 text-negative",
              )}
            >
              ≈ {up ? "+" : "−"}
              {formatPct(Math.abs(expectedPct!))}/mês
            </span>
          )}
          <span className="tnum text-sm text-muted">{formatBRL(total)}</span>
        </span>
      </div>
      <div className="mt-3">
        <BreakdownList items={items} />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { data: user } = useSession();
  // mes selecionado no filtro (padrao = mes atual); recalcula ganhos e gastos do mes
  const [month, setMonth] = useState(currentMonthKey());
  const monthYear = Number(month.slice(0, 4));

  const expensesQuery = useExpenses(!!user);
  const cardsQuery = useCreditCards(!!user);
  const personalQuery = usePersonalSummary(month, !!user);
  const extrasQuery = useExtrasSummary(month, !!user);
  const spendingLoading =
    expensesQuery.isLoading || cardsQuery.isLoading || personalQuery.isLoading || extrasQuery.isLoading;
  // gasto do mes = fixos + cartoes + gastos pessoais do mes + gastos extras do mes
  const spending = buildSpending(
    expensesQuery.data ?? [],
    cardsQuery.data ?? [],
    personalQuery.data?.monthTotal ?? 0,
    extrasQuery.data?.gastoTotal ?? 0,
  );

  // ganhos do mes = renda recorrente ativa no ano + ganhos extras do mes
  const incomesQuery = useIncomes(!!user);
  const earnings = buildEarnings(incomesQuery.data ?? [], monthYear, monthYear);
  const ganhosTotal = earnings.total + (extrasQuery.data?.ganhoTotal ?? 0);
  const monthLoading = spendingLoading || incomesQuery.isLoading;
  const resultado = ganhosTotal - spending.total; // o que sobra: ganhos - gastos
  const topExpenses = spending.items.slice(0, 3); // ja vem ordenado do maior pro menor

  const investmentsQuery = useInvestments(!!user);
  const allAssets = investmentsQuery.data ?? [];
  const patrimony = buildPatrimony(allAssets); // total geral (patrimonio + investimentos)
  // duas seccoes: investimentos (kind ausente conta aqui) e patrimonio (bens)
  const investAssets = allAssets.filter((i) => investmentKindOf(i) === "investimento");
  const bensAssets = allAssets.filter((i) => investmentKindOf(i) === "patrimonio");
  const investSection = buildPatrimony(investAssets);
  const bensSection = buildPatrimony(bensAssets);
  // variacao mensal esperada (estimativa) pela taxa de rendimento esperada de cada ativo
  const investExpectedPct = expectedMonthlyVariationPct(investAssets);
  const bensExpectedPct = expectedMonthlyVariationPct(bensAssets);

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

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Resumo do mês selecionado</p>
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Resultado do mês" period={monthLabel(month)} />
          {monthLoading ? (
            <p className="mt-2 text-sm text-muted">Carregando...</p>
          ) : (
            <>
              <p
                className={cn(
                  "tnum mt-2 text-3xl font-light tracking-tighter",
                  resultado > 0 && "text-positive",
                  resultado < 0 && "text-negative",
                  resultado === 0 && "text-heading",
                )}
              >
                {formatBRL(resultado)}
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-heading">Ganhos</span>
                  <span className="flex items-baseline gap-2">
                    <span className="tnum text-heading">{formatBRL(ganhosTotal)}</span>
                    {ganhosTotal === 0 && (
                      <Link to="/ganhos" className="text-brand transition hover:text-brand-dark">
                        adicionar
                      </Link>
                    )}
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-heading">Gastos</span>
                    <span className="tnum text-heading">{formatBRL(spending.total)}</span>
                  </div>
                  {topExpenses.length ? (
                    <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                      {topExpenses.map((item) => (
                        <li
                          key={item.name}
                          className="flex items-baseline justify-between gap-3 text-sm text-muted"
                        >
                          <span className="min-w-0 truncate">{item.name}</span>
                          <span className="tnum shrink-0">{formatBRL(item.value)}</span>
                        </li>
                      ))}
                      {spending.items.length > 3 && (
                        <li>
                          <Link
                            to="/gastos"
                            className="text-sm text-brand transition hover:text-brand-dark"
                          >
                            ver todos
                          </Link>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 pl-3 text-sm text-muted">
                      <Link to="/gastos" className="text-brand transition hover:text-brand-dark">
                        Adicionar gastos
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
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
                    expectedPct={investExpectedPct}
                  />
                )}
                {bensSection.items.length > 0 && (
                  <PatrimonySection
                    label="Patrimônio"
                    total={bensSection.total}
                    items={bensSection.items}
                    expectedPct={bensExpectedPct}
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
