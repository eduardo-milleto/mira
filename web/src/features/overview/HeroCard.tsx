import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { HealthGauge } from "./HealthGauge";
import { EvolutionTimeline } from "./EvolutionTimeline";

// primeiro nome pra saudacao
function firstName(name: string): string {
  return name.trim().split(" ")[0];
}

export function HeroCard({ userName }: { userName: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      {/* camada de fundo: placeholder do "caminho verde". a imagem da paisagem
          entra aqui depois (basta setar background-image nesta div). */}
      <div className="hero-landscape pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(34,197,94,0.25),transparent_55%),linear-gradient(180deg,#0d1410_0%,#0a0b0a_100%)]" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_auto_1.1fr] lg:items-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-light leading-tight tracking-tighter">
            Bom ver você aqui, <span className="text-brand">{firstName(userName)}.</span>
          </h1>
          <p className="mt-3 text-sm font-light text-muted">
            A Mira usa o que sabe sobre você para simplificar suas decisões e acelerar sua liberdade
            financeira.
          </p>
          <Button className="mt-6">
            Ver recomendações
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-6 flex items-start gap-2 text-sm font-light text-muted">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Você está no caminho certo. Mantenha o foco e siga evoluindo.
          </p>
        </div>

        <div className="flex justify-center">
          <HealthGauge value={78} label="Boa" delta="8,2% vs mês anterior" />
        </div>

        <div className="hidden lg:block">
          <EvolutionTimeline />
        </div>
      </div>
    </section>
  );
}
