import { ArrowRight, Info } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { formatBRL } from "../../lib/format";
import { StackedProjectionChart } from "../investimentos/StackedProjectionChart";
import { useInvestmentProjection } from "../investimentos/useInvestmentProjection";
import { ProjectionSettingsCard } from "./ProjectionSettingsCard";

export function ProjecoesPage() {
  const navigate = useNavigate();
  // projeta o patrimonio inteiro (investimentos + bens), sem filtro de kind
  const { rows, assets, hasData, last, growth, span, isLoading, isError } =
    useInvestmentProjection();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter">Projeções anuais</h1>
        <p className="mt-2 text-sm font-light text-muted">
          Estimativa do seu patrimônio nos próximos anos. Cada investimento e bem cresce pela própria
          taxa de rendimento e pelos aportes mensais que você planejar em cada ativo.
        </p>
      </div>

      <Card className="p-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          Patrimônio projetado <Info className="h-3.5 w-3.5 text-faint" />
        </p>

        {isLoading ? (
          <p className="mt-2 text-sm text-muted">Calculando projeção...</p>
        ) : isError ? (
          <p className="mt-2 text-sm text-muted">Projeção indisponível no momento.</p>
        ) : !hasData ? (
          <p className="mt-2 text-sm text-muted">Cadastre um investimento ou bem pra ver a projeção.</p>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-3">
              <p className="tnum text-4xl font-light tracking-tighter text-heading">
                {formatBRL(last ?? 0)}
              </p>
              {growth !== null && span > 0 && (
                <span className="tnum rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                  {growth >= 0 ? "+" : ""}
                  {growth}% em {span} {span === 1 ? "ano" : "anos"}
                </span>
              )}
            </div>
            <div className="mt-4">
              <StackedProjectionChart rows={rows} assets={assets} />
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
          O horizonte abaixo define por quantos anos a Mira projeta. A taxa de rendimento e o aporte
          mensal de cada ativo são definidos no próprio investimento, em{" "}
          <Link to="/investimentos" className="text-brand transition hover:text-brand-dark">
            Investimentos
          </Link>
          .
        </p>
      </div>

      <ProjectionSettingsCard />
    </div>
  );
}
