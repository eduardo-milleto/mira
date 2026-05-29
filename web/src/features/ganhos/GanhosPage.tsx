import { BarChart3, Coins, Info, PieChart, Sparkles } from "lucide-react";
import { Card } from "../../components/ui/Card";
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
  { icon: Coins, title: "Potenciais rendas", desc: "Descubra novas fontes de renda." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba recomendações para aumentar seus ganhos." },
  { icon: PieChart, title: "Investimentos", desc: "Acompanhe o impacto dos investimentos nos seus ganhos." },
];

export function GanhosPage() {
  const { data: user } = useSession();
  const { data: incomes, isLoading } = useIncomes(!!user);
  const currentYear = new Date().getFullYear();
  const earnings = buildEarnings(incomes ?? [], currentYear);
  const hasIncome = earnings.slices.length > 0;

  // ganhos extras do mes corrente entram no total do hero (renda recorrente + extras)
  const { data: extras } = useExtrasSummary(currentMonthKey(), !!user);
  const ganhosTotal = earnings.total + (extras?.ganhoTotal ?? 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                Cadastre suas fontes de renda abaixo para ver a composição dos seus ganhos.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Renda ativa vs futura" period="Este mês" />
          <div className="mt-6">
            {isLoading ? (
              <p className="text-sm text-muted">Carregando...</p>
            ) : (
              <ActiveVsFuture active={earnings.activeColumn} future={earnings.futureColumn} />
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

      <div>
        <h2 className="text-lg font-medium text-heading">Gerenciar fontes de renda</h2>
        <p className="mt-1 text-sm font-light text-muted">
          Adicione, edite ou remova suas rendas — elas alimentam seus ganhos e a projeção da Mira.
        </p>
      </div>
      <EarningsList />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {featureLinks.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </div>
  );
}
