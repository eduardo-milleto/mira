import type { BreakdownItem } from "../overview/data";
import type { Investment } from "./investimentos.api";

// monta o patrimonio agrupando os investimentos por categoria (classificacao).
// devolve o total e os itens (com percentual) ja ordenados pra alimentar a Visao geral.
export function buildPatrimony(investments: Investment[]): { total: number; items: BreakdownItem[] } {
  const byCategory = new Map<string, number>();
  for (const inv of investments) {
    byCategory.set(inv.category, (byCategory.get(inv.category) ?? 0) + inv.value);
  }

  const total = investments.reduce((sum, inv) => sum + inv.value, 0);

  const items = [...byCategory.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return { total, items };
}

// variacao mensal ESPERADA (estimativa) do grupo de ativos, a partir da taxa anual de cada
// um: taxa mensal = (1 + r/100)^(1/12) - 1, com r = expectedReturnPct (0 quando ausente).
// devolve a media ponderada pelo valor, em pontos percentuais (ex: 0.8 = +0,8%/mes).
// nao reflete aportes nem variacao real — e so a projecao de rendimento das premissas.
export function expectedMonthlyVariationPct(investments: Investment[]): number {
  const total = investments.reduce((sum, inv) => sum + inv.value, 0);
  if (total <= 0) return 0;

  const weighted = investments.reduce((sum, inv) => {
    const annual = (inv.expectedReturnPct ?? 0) / 100;
    const base = 1 + annual;
    // base <= 0 (queda esperada >= 100%/ano) seria NaN no expoente fracionario; trava em -100%
    const monthly = base > 0 ? Math.pow(base, 1 / 12) - 1 : -1;
    return sum + monthly * inv.value;
  }, 0);

  return (weighted / total) * 100;
}
