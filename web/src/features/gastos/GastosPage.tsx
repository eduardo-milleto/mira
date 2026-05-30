import { BarChart3, Home, Info, Sparkles } from "lucide-react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { Card } from "../../components/ui/Card";
import { pageTabClass, pageTabList } from "../../components/ui/pageTabs";
import { FeatureCard } from "../../components/FeatureCard";
import { currentMonthKey } from "../../lib/month";
import { useSession } from "../auth/auth.api";
import { useExtrasSummary } from "../extras/extras.api";
import { usePersonalSummary } from "../gastos-pessoais/personal.api";
import { CompositionChart } from "../ganhos/CompositionChart";
import { useCreditCards, useExpenses, useExpenseAreas } from "./gastos.api";
import { buildSpendingDashboard, buildAreaBreakdown } from "./spending";
import { SpendingHero } from "./SpendingHero";
import { SpendingSplit } from "./SpendingSplit";
import { TopSpending } from "./TopSpending";
import { ExpensesTab } from "./ExpensesTab";
import { CardsTab } from "./CardsTab";

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

const featureLinks = [
  { icon: Home, title: "Visão geral", desc: "Veja o resultado do mês: ganhos menos gastos." },
  { icon: BarChart3, title: "Projeções", desc: "Entenda o impacto dos gastos no seu futuro." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba recomendações para gastar melhor." },
];

export function GastosPage() {
  const { data: user } = useSession();
  const month = currentMonthKey();

  const { data: expenses, isLoading: loadingExpenses } = useExpenses(!!user);
  const { data: cards, isLoading: loadingCards } = useCreditCards(!!user);
  const { data: personal } = usePersonalSummary(month, !!user);
  const { data: extras } = useExtrasSummary(month, !!user);
  const isLoading = loadingExpenses || loadingCards;

  // mesmo gasto mensal da Visao geral: fixos + cartoes + gastos pessoais + extras do mes
  const spending = buildSpendingDashboard(
    expenses ?? [],
    cards ?? [],
    personal?.monthTotal ?? 0,
    extras?.gastoTotal ?? 0,
  );
  const hasSpending = spending.slices.length > 0;

  // gastos por area: classifica os nomes dos gastos mensais via IA e agrupa por area.
  // nomes unicos e ordenados pra nao refazer a chamada quando a ordem muda (cache estavel).
  const expenseNames = [...new Set((expenses ?? []).map((e) => e.name))].sort();
  const { data: areaMap, isLoading: loadingAreas } = useExpenseAreas(expenseNames, !!user);
  const areaBreakdown = buildAreaBreakdown(expenses ?? [], areaMap ?? {});
  const hasAreas = areaBreakdown.slices.length > 0;

  return (
    <Tabs className="mx-auto flex max-w-7xl flex-col gap-6">
      <TabList
        aria-label="Seções de gastos"
        className={pageTabList}
      >
        <Tab id="dashboard" className={pageTabClass}>
          Dashboard
        </Tab>
        <Tab id="gastos" className={pageTabClass}>
          Gastos fixos
        </Tab>
        <Tab id="cartoes" className={pageTabClass}>
          Cartões de crédito
        </Tab>
      </TabList>

      <TabPanel id="dashboard" className="flex flex-col gap-6 outline-none">
        <SpendingHero total={spending.total} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader title="Composição dos gastos" period="Este mês" />
            <div className="mt-6">
              {isLoading ? (
                <p className="text-sm text-muted">Carregando...</p>
              ) : hasSpending ? (
                <CompositionChart slices={spending.slices} total={spending.total} />
              ) : (
                <p className="text-sm text-muted">
                  Cadastre seus gastos para ver a composição dos seus gastos do mês.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader title="Gastos por área" period="Este mês" />
            <div className="mt-6">
              {isLoading || loadingAreas ? (
                <p className="text-sm text-muted">Carregando...</p>
              ) : hasAreas ? (
                <CompositionChart slices={areaBreakdown.slices} total={areaBreakdown.total} />
              ) : (
                <p className="text-sm text-muted">
                  Cadastre seus gastos fixos para ver os gastos por área.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <CardHeader title="Fixos vs variáveis" period="Este mês" />
          <div className="mt-6">
            {isLoading ? (
              <p className="text-sm text-muted">Carregando...</p>
            ) : (
              <SpendingSplit fixed={spending.fixedColumn} variable={spending.variableColumn} />
            )}
          </div>
        </Card>

        {hasSpending && (
          <Card className="p-6">
            <CardHeader title="Principais gastos este mês" />
            <div className="mt-5">
              <TopSpending items={spending.slices} />
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featureLinks.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </TabPanel>

      <TabPanel id="gastos" className="flex flex-col gap-6 outline-none">
        <div>
          <h2 className="text-lg font-medium text-heading">Gerenciar gastos fixos</h2>
          <p className="mt-1 text-sm font-light text-muted">
            Adicione, edite ou remova seus gastos fixos, eles alimentam seu gasto mensal.
          </p>
        </div>
        <ExpensesTab />
      </TabPanel>

      <TabPanel id="cartoes" className="flex flex-col gap-6 outline-none">
        <div>
          <h2 className="text-lg font-medium text-heading">Gerenciar cartões de crédito</h2>
          <p className="mt-1 text-sm font-light text-muted">
            Adicione, edite ou remova seus cartões, eles alimentam seu gasto mensal.
          </p>
        </div>
        <CardsTab />
      </TabPanel>
    </Tabs>
  );
}
