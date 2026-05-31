import { useMemo } from "react";
import { investmentKindOf, useInvestments, type InvestmentKind } from "./investimentos.api";
import { useProjectionSettings } from "../projecoes/projecoes.api";
import { projectInvestments } from "./projection";

// hook unico da projecao determinista, compartilhado por todos os cards que mostram projecao
// (Visao geral, Projecoes e Investimentos). kindFilter limita os ativos (ex: so "investimento");
// sem filtro, projeta o patrimonio inteiro. horizonOverride deixa o card responder na hora ao
// valor digitado antes de o settings persistir; quando ausente, usa o horizonte salvo.
export function useInvestmentProjection(kindFilter?: InvestmentKind, horizonOverride?: number) {
  const { data: investments, isLoading, isError } = useInvestments();
  const { data: settings } = useProjectionSettings();

  const horizonYears =
    horizonOverride && horizonOverride >= 1 && horizonOverride <= 30
      ? horizonOverride
      : (settings?.horizonYears ?? 5);

  const { rows, assets } = useMemo(() => {
    const items = (investments ?? []).filter(
      (i) => !kindFilter || investmentKindOf(i) === kindFilter,
    );
    const now = new Date();
    // getMonth() e 0-based; +1 deixa janeiro=1 ... dezembro=12 pro calculo ate o fim do ano
    return projectInvestments(items, horizonYears, now.getFullYear(), now.getMonth() + 1);
  }, [investments, horizonYears, kindFilter]);

  const hasData = rows.length > 0 && assets.length > 0;
  const first = rows[0]?.total;
  const last = rows[rows.length - 1]?.total;
  const growth = first && last ? Math.round((last / first - 1) * 100) : null;
  const span = rows.length > 1 ? rows.length - 1 : 0;

  return { rows, assets, hasData, first, last, growth, span, isLoading, isError };
}
