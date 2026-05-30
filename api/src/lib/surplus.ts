import { prisma } from "../prisma.js";
import { monthRange } from "./month.js";

// arredonda pra 2 casas pra cortar ruido de ponto flutuante na soma de valores
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// sobra calculada de um mes = ganhos do mes - gastos do mes. ganhos = renda recorrente ativa
// naquele ano + ganhos extras do mes; gastos = fixos + cartoes marcados + gastos pessoais do
// mes + gastos extras do mes. mesma logica do "Resultado do mes" da Visao geral, no servidor
// pra ser autoritativa. usada pelo Cofre (fechamento de mes) e pelo Saldo no banco (projecao).
export async function computeSurplus(userId: string, month: string, now: Date): Promise<number> {
  const { start, end } = monthRange(month, now);
  const year = Number(month.slice(0, 4));
  const [incomes, expenses, cards, personal, extras] = await Promise.all([
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.creditCard.findMany({ where: { userId } }),
    prisma.personalExpense.findMany({ where: { userId, spentAt: { gte: start, lt: end } } }),
    prisma.extra.findMany({ where: { userId, occurredAt: { gte: start, lt: end } } }),
  ]);

  // renda ativa = sem startYear ou ja vigente naquele ano (mesma regra do buildEarnings)
  const income = incomes
    .filter((i) => i.startYear == null || i.startYear <= year)
    .reduce((sum, i) => sum + i.monthlyAmount.toNumber(), 0);
  const recurringExpenses =
    expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0) +
    cards
      .filter((c) => c.includeInMonthly)
      .reduce((sum, c) => sum + c.avgMonthlySpend.toNumber(), 0);
  const personalTotal = personal.reduce((sum, p) => sum + p.amount.toNumber(), 0);

  let extrasGanho = 0;
  let extrasGasto = 0;
  for (const e of extras) {
    const value = e.amount.toNumber();
    if (e.kind === "ganho") extrasGanho += value;
    else extrasGasto += value;
  }

  return round2(income + extrasGanho - (recurringExpenses + personalTotal + extrasGasto));
}
