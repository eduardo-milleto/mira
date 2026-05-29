import type { IncomeSource } from "../projecoes/projecoes.api";

// cores distintas por fatia (uso semantico: diferenciar fontes de renda no grafico)
const PALETTE = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#eab308", "#f97316"];

export type EarningsSlice = { name: string; value: number; percent: number; color: string };

// monta os ganhos do mes a partir das fontes de renda reais.
// renda "ativa" = ja vigente (sem startYear ou com startYear no passado/ano atual);
// renda "futura" = comeca num ano a frente. so a ativa entra no total do mes.
export function buildEarnings(incomes: IncomeSource[], currentYear: number) {
  const isActive = (i: IncomeSource) => i.startYear == null || i.startYear <= currentYear;
  const active = incomes.filter(isActive);
  const future = incomes.filter((i) => !isActive(i));

  const total = active.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const futureTotal = future.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const combined = total + futureTotal;

  // fatias ordenadas (maior pra menor) pra composicao e principais fontes
  const slices: EarningsSlice[] = active
    .slice()
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    .map((i, idx) => ({
      name: i.name,
      value: i.monthlyAmount,
      percent: total > 0 ? (i.monthlyAmount / total) * 100 : 0,
      color: PALETTE[idx % PALETTE.length],
    }));

  return {
    total,
    slices,
    // colunas "ativa vs futura": percentual relativo ao total ativa + futura
    activeColumn: { value: total, percent: combined > 0 ? (total / combined) * 100 : 0 },
    futureColumn: { value: futureTotal, percent: combined > 0 ? (futureTotal / combined) * 100 : 0 },
  };
}
