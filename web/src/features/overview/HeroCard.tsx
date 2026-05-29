import { ArrowRight, TrendingUp } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../../components/ui/Button";
import { HealthGauge } from "./HealthGauge";
import { EvolutionTimeline } from "./EvolutionTimeline";
import type { Insights } from "./insights.api";

// primeiro nome pra saudacao
function firstName(name: string): string {
  return name.trim().split(" ")[0];
}

type HeroCardProps = {
  userName: string;
  insights?: Insights;
  loading?: boolean;
};

export function HeroCard({ userName, insights, loading }: HeroCardProps) {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      {/* video de fundo do hero + overlay escuro pra legibilidade do conteudo */}
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

      <div className="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_auto_1.1fr] lg:items-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-light leading-tight tracking-tighter">
            Bom ver você aqui, <span className="text-brand">{firstName(userName)}.</span>
          </h1>
          <p className="mt-3 text-sm font-light text-muted">
            A Mira usa o que sabe sobre você para simplificar suas decisões e acelerar sua liberdade
            financeira.
          </p>
          <Button className="mt-6" onPress={() => navigate({ to: "/sugestoes" })}>
            Ver recomendações
            <ArrowRight className="h-4 w-4" />
          </Button>
          {insights?.insight && (
            <p className="mt-6 flex items-start gap-2 text-sm font-light text-muted">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {insights.insight}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <HealthGauge value={insights?.healthScore} label={insights?.status} loading={loading} />
        </div>

        <div className="hidden lg:block">
          <EvolutionTimeline steps={insights?.steps} loading={loading} />
        </div>
      </div>
    </section>
  );
}
