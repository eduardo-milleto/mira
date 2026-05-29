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
