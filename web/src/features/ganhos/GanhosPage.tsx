import { BarChart3, Coins, Info, PieChart, Sparkles } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { FeatureCard } from "../../components/FeatureCard";
import { EarningsHero } from "./EarningsHero";
import { CompositionChart } from "./CompositionChart";
import { RecurringVsVariable } from "./RecurringVsVariable";
import { TopSources } from "./TopSources";

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
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <EarningsHero />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Composição dos ganhos" period="Este mês" />
          <div className="mt-6">
            <CompositionChart />
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Renda recorrente vs variável" period="Este mês" />
          <div className="mt-6">
            <RecurringVsVariable />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader title="Principais fontes este mês" />
        <div className="mt-5">
          <TopSources />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {featureLinks.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </div>
  );
}
