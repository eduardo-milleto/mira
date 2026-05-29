import { BarChart3, Home, Info, Sparkles } from "lucide-react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { Card } from "../../components/ui/Card";
import { FeatureCard } from "../../components/FeatureCard";
import { currentMonthKey } from "../../lib/month";
import { useSession } from "../auth/auth.api";
import { useExtrasSummary } from "../extras/extras.api";
import { usePersonalSummary } from "../gastos-pessoais/personal.api";
import { CompositionChart } from "../ganhos/CompositionChart";
import { useCreditCards, useExpenses } from "./gastos.api";
import { buildSpendingDashboard } from "./spending";
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

const tabBase =
  "cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40";
const tabInactive = "text-muted data-[hovered]:text-heading";
const tabSelected = "bg-surface-2 text-heading shadow-card";

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                Cadastre seus gastos abaixo para ver a composição dos seus gastos do mês.
              </p>
            )}
          </div>
        </Card>

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
      </div>

      {hasSpending && (
        <Card className="p-6">
          <CardHeader title="Principais gastos este mês" />
          <div className="mt-5">
            <TopSpending items={spending.slices} />
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-medium text-heading">Gerenciar gastos e cartões</h2>
        <p className="mt-1 text-sm font-light text-muted">
          Adicione, edite ou remova seus gastos fixos e cartões — eles alimentam seu gasto mensal.
        </p>
      </div>

      <Tabs>
        <TabList
          aria-label="Seções de gastos"
          className="inline-flex gap-1 rounded-xl border border-border bg-surface/60 p-1"
        >
          <Tab id="gastos" className={({ isSelected }) => `${tabBase} ${isSelected ? tabSelected : tabInactive}`}>
            Gastos fixos
          </Tab>
          <Tab id="cartoes" className={({ isSelected }) => `${tabBase} ${isSelected ? tabSelected : tabInactive}`}>
            Cartões de crédito
          </Tab>
        </TabList>

        <TabPanel id="gastos" className="mt-6 outline-none">
          <ExpensesTab />
        </TabPanel>
        <TabPanel id="cartoes" className="mt-6 outline-none">
          <CardsTab />
        </TabPanel>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {featureLinks.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </div>
  );
}
