import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ComboboxField } from "../../components/ui/Combobox";
import { formatBRL } from "../../lib/format";
import { StackedProjectionChart } from "./StackedProjectionChart";
import { projectInvestments } from "./projection";
import { investmentKindOf, useInvestments } from "./investimentos.api";
import { useProjectionSettings, useUpdateProjectionSettings } from "../projecoes/projecoes.api";

// horizontes comuns; allowsCustomValue do combobox deixa digitar outro valor
const HORIZON_OPTIONS = ["3", "5", "10", "15", "20"];

export function PatrimonyProjectionCard() {
  const navigate = useNavigate();
  // projeta so os investimentos (kind="investimento"), de fora os bens de patrimonio
  const { data: investments, isLoading, isError } = useInvestments();
  const { data: settings } = useProjectionSettings();
  const updateSettings = useUpdateProjectionSettings();

  // horizonte e fonte unica: vem das premissas globais (ProjectionSettings)
  const [horizon, setHorizon] = useState("");
  useEffect(() => {
    if (settings) setHorizon(String(settings.horizonYears));
  }, [settings]);

  function handleHorizonChange(next: string) {
    setHorizon(next);
    const num = Number.parseInt(next, 10);
    if (
      Number.isInteger(num) &&
      num >= 1 &&
      num <= 30 &&
      settings &&
      num !== settings.horizonYears
    ) {
      updateSettings.mutate({ horizonYears: num });
    }
  }

  // horizonte efetivo: o valor digitado quando valido, senao a premissa salva (fallback 5 anos)
  const parsedHorizon = Number.parseInt(horizon, 10);
  const horizonYears =
    Number.isInteger(parsedHorizon) && parsedHorizon >= 1 && parsedHorizon <= 30
      ? parsedHorizon
      : (settings?.horizonYears ?? 5);

  const { rows, assets } = useMemo(() => {
    const invItems = (investments ?? []).filter((i) => investmentKindOf(i) === "investimento");
    const now = new Date();
    // getMonth() e 0-based; +1 deixa janeiro=1 ... dezembro=12 pro calculo ate o fim do ano
    return projectInvestments(invItems, horizonYears, now.getFullYear(), now.getMonth() + 1);
  }, [investments, horizonYears]);

  const hasData = rows.length > 0 && assets.length > 0;
  const first = rows[0]?.total;
  const last = rows[rows.length - 1]?.total;
  const growth = first && last ? Math.round((last / first - 1) * 100) : null;
  const span = rows.length > 1 ? rows.length - 1 : 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          Projeção dos investimentos <Info className="h-3.5 w-3.5 text-faint" />
        </p>
        <div className="w-32">
          <ComboboxField
            label="Horizonte (anos)"
            options={HORIZON_OPTIONS}
            value={horizon}
            onChange={handleHorizonChange}
            placeholder="Anos"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted">Calculando projeção...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-muted">Projeção indisponível no momento.</p>
      ) : !hasData ? (
        <p className="mt-4 text-sm text-muted">
          Cadastre um investimento pra ver a projeção.
        </p>
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
  );
}
