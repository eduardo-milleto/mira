import { useState } from "react";
import { BarChart3, Info, PieChart, Sparkles } from "lucide-react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { Card } from "../../components/ui/Card";
import { pageTabClass, pageTabList } from "../../components/ui/pageTabs";
import { FeatureCard } from "../../components/FeatureCard";
import { useSession } from "../auth/auth.api";
import { useIncomes } from "../projecoes/projecoes.api";
import { useExtrasSummary } from "../extras/extras.api";
import { currentMonthKey } from "../../lib/month";
import { buildEarnings } from "./earnings";
import { EarningsHero } from "./EarningsHero";
import { CompositionChart } from "./CompositionChart";
import { ActiveVsFuture } from "./ActiveVsFuture";
import { TopSources } from "./TopSources";
import { EarningsList } from "./EarningsList";

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
  { icon: BarChart3, title: "Projeções", desc: "Veja suas projeções futuras de ganhos." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba recomendações para aumentar seus ganhos." },
  { icon: PieChart, title: "Investimentos", desc: "Acompanhe o impacto dos investimentos nos seus ganhos." },
];

export function GanhosPage() {
  const { data: user } = useSession();
  const { data: incomes, isLoading } = useIncomes(!!user);
  const currentYear = new Date().getFullYear();
  // ano de referencia da renda futura: por padrao o ano que vem, ajustavel pelo stepper
  const minFutureYear = currentYear + 1;
  const maxFutureYear = currentYear + 30;
  const [futureYear, setFutureYear] = useState(minFutureYear);
  const earnings = buildEarnings(incomes ?? [], currentYear, futureYear);
  const hasIncome = earnings.slices.length > 0;

  // ganhos extras do mes corrente entram no total do hero (renda recorrente + extras)
  const { data: extras } = useExtrasSummary(currentMonthKey(), !!user);
  const ganhosTotal = earnings.total + (extras?.ganhoTotal ?? 0);

  return (
    <Tabs className="mx-auto flex max-w-7xl flex-col gap-6">
      <TabList aria-label="Seções de ganhos" className={pageTabList}>
        <Tab id="dashboard" className={pageTabClass}>
          Dashboard
        </Tab>
        <Tab id="fontes" className={pageTabClass}>
          Fontes de renda
        </Tab>
      </TabList>

      <TabPanel id="dashboard" className="flex flex-col gap-6 outline-none">
        <EarningsHero total={ganhosTotal} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader title="Composição dos ganhos" period="Este mês" />
            <div className="mt-6">
              {isLoading ? (
                <p className="text-sm text-muted">Carregando...</p>
              ) : hasIncome ? (
                <CompositionChart slices={earnings.slices} total={earnings.total} />
              ) : (
                <p className="text-sm text-muted">
                  Cadastre suas fontes de renda para ver a composição dos seus ganhos.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader title="Renda ativa vs futura" />
            <div className="mt-6">
              {isLoading ? (
                <p className="text-sm text-muted">Carregando...</p>
              ) : (
                <ActiveVsFuture
                  active={earnings.activeValue}
                  future={earnings.futureValue}
                  futureYear={futureYear}
                  minYear={minFutureYear}
                  maxYear={maxFutureYear}
                  onYearChange={(y) => setFutureYear(Math.min(maxFutureYear, Math.max(minFutureYear, y)))}
                />
              )}
            </div>
          </Card>
        </div>

        {hasIncome && (
          <Card className="p-6">
            <CardHeader title="Principais fontes este mês" />
            <div className="mt-5">
              <TopSources sources={earnings.slices} />
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureLinks.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </TabPanel>

      <TabPanel id="fontes" className="flex flex-col gap-6 outline-none">
        <div>
          <h2 className="text-lg font-medium text-heading">Gerenciar fontes de renda</h2>
          <p className="mt-1 text-sm font-light text-muted">
            Adicione, edite ou remova suas rendas, elas alimentam seus ganhos e a projeção da Mira.
          </p>
        </div>
        <EarningsList />
      </TabPanel>
    </Tabs>
  );
}
