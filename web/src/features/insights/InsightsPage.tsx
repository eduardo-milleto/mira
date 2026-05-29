import { Sparkles, TrendingUp } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useInsightsData } from "../overview/insights.api";
import type { Recommendation } from "../overview/insights.api";

// dot da prioridade: alta = brand (chama atencao), media = muted, baixa = faint
function priorityDot(priority: string): string {
  const p = priority.toLowerCase();
  if (p.startsWith("alta")) return "bg-brand";
  if (p.startsWith("med")) return "bg-white/40";
  return "bg-white/20";
}

function RecommendationItem({ rec }: { rec: Recommendation }) {
  return (
    <li className="rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot(rec.priority)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-heading">{rec.title}</p>
            <span className="shrink-0 text-xs uppercase tracking-wide text-faint">{rec.priority}</span>
          </div>
          <p className="mt-1.5 text-sm font-light leading-relaxed text-muted">{rec.description}</p>
        </div>
      </div>
    </li>
  );
}

export function InsightsPage() {
  const { data, isLoading, isError } = useInsightsData();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Sparkles className="h-4 w-4 text-brand" />
          Sugestões da Mira
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tighter">
          Recomendações para <span className="text-brand">melhorar suas finanças</span>
        </h1>
        {data && (
          <p className="mt-2 text-sm font-light text-muted">
            Saúde financeira atual: <span className="text-heading">{Math.round(data.healthScore)}%</span>{" "}
            ({data.status}). {data.insight}
          </p>
        )}
      </div>

      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-muted">A Mira está analisando suas finanças...</p>
        </Card>
      ) : isError || !data ? (
        <Card className="p-6">
          <p className="text-sm text-muted">
            Não foi possível gerar as recomendações agora. Tente novamente em alguns instantes.
          </p>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3">
            {data.recommendations.map((rec) => (
              <RecommendationItem key={rec.title} rec={rec} />
            ))}
          </ul>

          <Card className="p-6" id="projecao">
            <p className="flex items-center gap-2 text-sm text-muted">
              <TrendingUp className="h-4 w-4 text-brand" />
              Sua projeção explicada
            </p>
            <p className="mt-3 text-sm font-light leading-relaxed text-muted">
              {data.projectionExplanation}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
