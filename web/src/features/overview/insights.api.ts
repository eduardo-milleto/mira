import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useSession } from "../auth/auth.api";
import { useCreditCards, useExpenses } from "../gastos/gastos.api";
import { buildSpending } from "../gastos/spending";
import { useIncomes, useProjectionSettings } from "../projecoes/projecoes.api";
import { investmentKindOf, useInvestments, type InvestmentKind } from "../investimentos/investimentos.api";
import { buildPatrimony } from "../investimentos/patrimony";
import { usePersonalSummary } from "../gastos-pessoais/personal.api";

export type EvolutionStep = { label: string; percent: number; status: string };
export type ProjectionPoint = { year: string; value: number };
export type Recommendation = { title: string; description: string; priority: string };

export type Insights = {
  healthScore: number;
  status: string;
  insight: string;
  steps: EvolutionStep[];
  projection: ProjectionPoint[];
  projectionExplanation: string;
  recommendations: Recommendation[];
};

export type BreakdownInput = { name: string; value: number };
export type IncomeSourceInput = {
  name: string;
  monthlyAmount: number;
  annualGrowthPct: number;
  startYear: number | null;
  steps: { year: number; monthlyAmount: number }[];
};
export type InvestmentInput = {
  name: string;
  category: string;
  value: number;
  expectedReturnPct: number | null;
  notes: string | null;
};

export type InsightsInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  spendingBreakdown: BreakdownInput[];
  assetBreakdown: BreakdownInput[];
  incomeSources: IncomeSourceInput[];
  investments: InvestmentInput[];
  returnRatePct: number;
  horizonYears: number;
};

// calcula saude financeira + projecao + recomendacoes via Gemini (backend).
// cache longo: o resultado nao muda a cada navegacao e a chamada custa/demora.
export function useInsights(input: InsightsInput, enabled = true) {
  return useQuery({
    queryKey: ["insights", input],
    queryFn: () => api.post<Insights>("/insights", input),
    enabled,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
}

// monta o input dos insights a partir do gasto real + fontes de renda + premissas (banco).
// usado na Visao geral, Sugestoes IA e Projecoes — mesmo input = mesmo cache.
// kindFilter limita os ativos considerados (ex: a Investimentos projeta so kind="investimento",
// fora os bens de patrimonio); sem filtro, conta o patrimonio inteiro.
export function useInsightsData(kindFilter?: InvestmentKind) {
  const { data: user } = useSession();
  const expensesQuery = useExpenses(!!user);
  const cardsQuery = useCreditCards(!!user);
  const incomesQuery = useIncomes(!!user);
  const settingsQuery = useProjectionSettings(!!user);
  const investmentsQuery = useInvestments(!!user);
  const personalQuery = usePersonalSummary(!!user);
  const loading =
    expensesQuery.isLoading ||
    cardsQuery.isLoading ||
    incomesQuery.isLoading ||
    settingsQuery.isLoading ||
    investmentsQuery.isLoading ||
    personalQuery.isLoading;

  const spending = buildSpending(
    expensesQuery.data ?? [],
    cardsQuery.data ?? [],
    personalQuery.data?.monthTotal ?? 0,
  );
  const incomes = incomesQuery.data ?? [];
  const settings = settingsQuery.data;
  const allInvestments = investmentsQuery.data ?? [];
  const investments = kindFilter
    ? allInvestments.filter((i) => investmentKindOf(i) === kindFilter)
    : allInvestments;
  const patrimony = buildPatrimony(investments);
  const currentYear = new Date().getFullYear();

  // renda mensal = soma das fontes ja ativas (rendas futuras so contam a partir do startYear)
  const monthlyIncome = incomes
    .filter((i) => i.startYear == null || i.startYear <= currentYear)
    .reduce((sum, i) => sum + i.monthlyAmount, 0);

  const input: InsightsInput = {
    monthlyIncome,
    monthlyExpenses: spending.total,
    netWorth: patrimony.total,
    spendingBreakdown: spending.items.map((i) => ({ name: i.name, value: i.value })),
    assetBreakdown: patrimony.items.map((a) => ({ name: a.name, value: a.value })),
    incomeSources: incomes.map((i) => ({
      name: i.name,
      monthlyAmount: i.monthlyAmount,
      annualGrowthPct: i.annualGrowthPct,
      startYear: i.startYear,
      steps: i.steps,
    })),
    investments: investments.map((i) => ({
      name: i.name,
      category: i.category,
      value: i.value,
      expectedReturnPct: i.expectedReturnPct,
      notes: i.notes,
    })),
    returnRatePct: settings?.returnRatePct ?? 10,
    horizonYears: settings?.horizonYears ?? 5,
  };

  // so dispara quando gasto, fontes e premissas ja carregaram (evita chamada incompleta)
  return useInsights(input, !!user && !loading);
}
