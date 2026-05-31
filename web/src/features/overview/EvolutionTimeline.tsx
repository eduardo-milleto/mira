import { Calendar, Check, Flag, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EvolutionStep } from "./insights.api";

const icons: LucideIcon[] = [Check, Target, Calendar, Flag];

// traduz o status que vem da IA (geralmente em ingles) pro portugues
function statusLabel(status?: string): string {
  if (!status) return "";
  const map: Record<string, string> = {
    current: "atual",
    upcoming: "em breve",
    next: "proximo",
    done: "concluido",
    completed: "concluido",
  };
  return map[status.trim().toLowerCase()] ?? status;
}

// trilha "Sua evolução financeira": 4 marcos ligados por uma linha.
// recebe os passos calculados; sem dados (loading/erro) mostra placeholders.
export function EvolutionTimeline({ steps, loading }: { steps?: EvolutionStep[]; loading?: boolean }) {
  const items: (EvolutionStep | null)[] =
    steps && steps.length ? steps.slice(0, 4) : [null, null, null, null];

  return (
    <div className="w-full">
      <p className="mb-6 text-base font-light text-muted">Sua evolução financeira</p>
      <div className="relative flex justify-between">
        {/* linha de conexao atras dos icones */}
        <div className="absolute left-5 right-5 top-5 h-px -translate-y-1/2 bg-border" />
        {items.map((step, i) => {
          const Icon = icons[i] ?? Flag;
          const done = step !== null && i === 0;
          return (
            <div key={step?.label ?? i} className="relative flex flex-1 flex-col items-center text-center">
              <span
                className={
                  done
                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-black shadow-glow"
                    : "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-faint"
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 flex h-8 max-w-[7rem] items-center text-xs leading-tight text-muted">
                {step?.label ?? "—"}
              </span>
              <span className="tnum mt-1 text-lg font-light text-heading">
                {step ? `${Math.round(step.percent)}%` : loading ? "..." : "—"}
              </span>
              <span className="text-xs text-brand">{statusLabel(step?.status)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
