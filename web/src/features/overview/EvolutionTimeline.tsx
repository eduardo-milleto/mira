import { Calendar, Check, Flag, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { evolutionSteps } from "./data";

const icons: LucideIcon[] = [Check, Target, Calendar, Flag];

// trilha "Sua evolução financeira": 4 marcos ligados por uma linha
export function EvolutionTimeline() {
  return (
    <div className="w-full">
      <p className="mb-6 text-base font-light text-muted">Sua evolução financeira</p>
      <div className="relative flex justify-between">
        {/* linha de conexao atras dos icones */}
        <div className="absolute left-5 right-5 top-5 h-px -translate-y-1/2 bg-border" />
        {evolutionSteps.map((step, i) => {
          const Icon = icons[i];
          return (
            <div key={step.label} className="relative flex flex-1 flex-col items-center text-center">
              <span
                className={
                  step.done
                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-black shadow-glow"
                    : "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-faint"
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 max-w-[7rem] text-xs text-muted">{step.label}</span>
              <span className="tnum mt-1 text-lg font-light text-heading">{step.percent}%</span>
              <span className="text-xs text-brand">{step.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
