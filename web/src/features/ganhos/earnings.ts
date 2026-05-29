import type { IncomeSource } from "../projecoes/projecoes.api";

// cores distintas por fatia (uso semantico: diferenciar fontes de renda no grafico)
const PALETTE = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#eab308", "#f97316"];

export type EarningsSlice = { name: string; value: number; percent: number; color: string };

// projeta o valor mensal de uma fonte num ano alvo, respeitando:
// - inicio futuro (startYear): antes disso a fonte ainda nao rende;
// - crescimento anual (annualGrowthPct): juros compostos ano a ano;
// - valores definidos (steps): fixam o valor naquele ano e o crescimento volta a contar a partir dele.
export function monthlyIncomeForYear(income: IncomeSource, year: number, currentYear: number): number {
  // ano em que o valor-base (monthlyAmount) vale: hoje, ou o ano de inicio da renda futura
  const baseYear = income.startYear ?? currentYear;
  // fonte futura ainda nao rende antes de comecar
  if (year < baseYear) return 0;

  // pontos de valor conhecido (base + steps); cada step sobrescreve o crescimento a partir do seu ano
  const knownPoints = [
    { year: baseYear, amount: income.monthlyAmount },
    ...income.steps.map((s) => ({ year: s.year, amount: s.monthlyAmount })),
  ];
  // ancora = ponto conhecido mais recente que nao passa do ano alvo (sempre existe: baseYear <= year aqui)
  const anchor = knownPoints
    .filter((p) => p.year <= year)
    .reduce((latest, p) => (p.year > latest.year ? p : latest));

  // a partir da ancora, cresce pelo percentual anual ate o ano alvo
  return anchor.amount * Math.pow(1 + income.annualGrowthPct / 100, year - anchor.year);
}

// monta os ganhos a partir das fontes de renda reais.
// "ativa agora" = renda mensal vigente no ano atual;
// "futura" = renda mensal total projetada para o ano selecionado (atuais crescendo + steps + rendas que comecam ate la).
export function buildEarnings(incomes: IncomeSource[], currentYear: number, futureYear: number) {
  // renda mensal por fonte hoje (fontes futuras ainda valem 0 no ano atual)
  const current = incomes.map((i) => ({ income: i, value: monthlyIncomeForYear(i, currentYear, currentYear) }));
  const total = current.reduce((sum, c) => sum + c.value, 0);

  // renda total projetada no ano selecionado
  const futureTotal = incomes.reduce((sum, i) => sum + monthlyIncomeForYear(i, futureYear, currentYear), 0);

  // composicao e principais fontes usam a renda ativa de hoje, ordenada da maior pra menor
  const slices: EarningsSlice[] = current
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((c, idx) => ({
      name: c.income.name,
      value: c.value,
      percent: total > 0 ? (c.value / total) * 100 : 0,
      color: PALETTE[idx % PALETTE.length],
    }));

  return {
    total,
    slices,
    activeValue: total,
    futureValue: futureTotal,
  };
}
