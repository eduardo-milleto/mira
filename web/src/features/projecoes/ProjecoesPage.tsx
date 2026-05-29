import { ArrowRight, Info } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { formatBRL } from "../../lib/format";
import { ProjectionChart } from "../overview/ProjectionChart";
import { useInsightsData } from "../overview/insights.api";
import { ProjectionSettingsCard } from "./ProjectionSettingsCard";

export function ProjecoesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useInsightsData();

  const projection = data?.projection ?? [];
  const first = projection[0]?.value;
  const last = projection[projection.length - 1]?.value;
  const growth = first && last ? Math.round((last / first - 1) * 100) : null;
  const span = projection.length > 1 ? projection.length - 1 : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter">Projeções anuais</h1>
        <p className="mt-2 text-sm font-light text-muted">
          Estimativa do seu patrimônio nos próximos anos, calculada pela Mira a partir dos seus ganhos,
          gastos e patrimônio atual.
        </p>
      </div>

      <Card className="p-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          Patrimônio projetado <Info className="h-3.5 w-3.5 text-faint" />
        </p>

        {isLoading ? (
          <p className="mt-2 text-sm text-muted">Calculando projeção...</p>
        ) : isError || !projection.length ? (
          <p className="mt-2 text-sm text-muted">Projeção indisponível no momento.</p>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-3">
              <p className="tnum text-4xl font-light tracking-tighter text-heading">
                {formatBRL(last ?? 0)}
              </p>
              {growth !== null && (
                <span className="tnum rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                  +{growth}% em {span} anos
                </span>
              )}
            </div>
            <div className="mt-4">
              <ProjectionChart data={projection} />
            </div>
            <Button
              variant="outline"
              className="mt-6"
              onPress={() => navigate({ to: "/sugestoes", hash: "projecao" })}
            >
              Entender esta projeção
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-medium text-heading">Ajuste sua projeção</h2>
        <p className="mt-1 text-sm font-light text-muted">
          As premissas abaixo e suas fontes de renda alimentam o cálculo acima. As rendas são
          gerenciadas em{" "}
          <Link to="/ganhos" className="text-brand transition hover:text-brand-dark">
            Ganhos mensais
          </Link>
          .
        </p>
      </div>

      <ProjectionSettingsCard />
    </div>
  );
}
