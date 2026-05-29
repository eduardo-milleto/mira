import type { BreakdownItem } from "../overview/data";
import type { CreditCard, Expense } from "./gastos.api";

// monta o gasto mensal: gastos avulsos + cartoes marcados como "incluir no gasto mensal"
// + o total de gastos pessoais do mes + os gastos extras (pontuais) do mes. cada agregado
// entra como um item unico quando > 0. devolve total e itens (com %) ordenados pra Visao geral.
export function buildSpending(
  expenses: Expense[],
  cards: CreditCard[],
  personalMonthTotal = 0,
  extraGastoTotal = 0,
): { total: number; items: BreakdownItem[] } {
  const raw = [
    ...expenses.map((e) => ({ name: e.name, value: e.amount })),
    ...cards.filter((c) => c.includeInMonthly).map((c) => ({ name: c.name, value: c.avgMonthlySpend })),
    ...(personalMonthTotal > 0 ? [{ name: "Gastos pessoais", value: personalMonthTotal }] : []),
    ...(extraGastoTotal > 0 ? [{ name: "Gastos extras", value: extraGastoTotal }] : []),
  ];

  const total = raw.reduce((sum, item) => sum + item.value, 0);

  const items = raw
    .map((item) => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return { total, items };
}
