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

// cores distintas por fatia (uso semantico: diferenciar os gastos no grafico).
// tons quentes (vermelho/laranja) pra leitura de "saida de dinheiro", em contraste
// com o verde dos ganhos.
const PALETTE = ["#f87171", "#fb923c", "#facc15", "#a855f7", "#3b82f6", "#14b8a6", "#ec4899", "#22c55e"];

export type SpendingSlice = BreakdownItem & { color: string };

// monta a visao do dashboard de Gastos a partir do mesmo gasto mensal da Visao geral:
// reaproveita buildSpending pro total/itens e adiciona cor por fatia + o split
// "fixos vs variaveis" (recorrente do mes contra pontual do mes).
export function buildSpendingDashboard(
  expenses: Expense[],
  cards: CreditCard[],
  personalMonthTotal = 0,
  extraGastoTotal = 0,
) {
  const { total, items } = buildSpending(expenses, cards, personalMonthTotal, extraGastoTotal);

  const slices: SpendingSlice[] = items
    .filter((item) => item.value > 0)
    .map((item, idx) => ({ ...item, color: PALETTE[idx % PALETTE.length] }));

  // fixos = gastos recorrentes (avulsos cadastrados + cartoes do mensal)
  // variaveis = gastos do mes (pessoais + extras pontuais)
  const fixed =
    expenses.reduce((sum, e) => sum + e.amount, 0) +
    cards.filter((c) => c.includeInMonthly).reduce((sum, c) => sum + c.avgMonthlySpend, 0);
  const variable = personalMonthTotal + extraGastoTotal;

  return {
    total,
    slices,
    fixedColumn: { value: fixed, percent: total > 0 ? (fixed / total) * 100 : 0 },
    variableColumn: { value: variable, percent: total > 0 ? (variable / total) * 100 : 0 },
  };
}

// monta a rosca "gastos por area": agrupa SO os gastos mensais nomeados (Expense) pela
// area que a IA classificou (mapa nome -> area), soma por area e adiciona % + cor por fatia.
// nomes ainda sem classificacao (mapa carregando ou desconhecido) caem em "Outros".
export function buildAreaBreakdown(
  expenses: Expense[],
  areas: Record<string, string>,
): { total: number; slices: SpendingSlice[] } {
  const byArea = new Map<string, number>();
  for (const e of expenses) {
    const area = areas[e.name] ?? "Outros";
    byArea.set(area, (byArea.get(area) ?? 0) + e.amount);
  }
  const total = [...byArea.values()].reduce((sum, value) => sum + value, 0);

  const slices: SpendingSlice[] = [...byArea.entries()]
    .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, color: PALETTE[idx % PALETTE.length] }));

  return { total, slices };
}
