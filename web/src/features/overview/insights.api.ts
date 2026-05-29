import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useSession } from "../auth/auth.api";
import { useCreditCards, useExpenses } from "../gastos/gastos.api";
import { buildSpending } from "../gastos/spending";
import { useIncomes, useProjectionSettings } from "../projecoes/projecoes.api";
import { assetBreakdown, netWorth } from "./data";

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
};

export type InsightsInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  spendingBreakdown: BreakdownInput[];
  assetBreakdown: BreakdownInput[];
  incomeSources: IncomeSourceInput[];
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
export function useInsightsData() {
  const { data: user } = useSession();
  const expensesQuery = useExpenses(!!user);
  const cardsQuery = useCreditCards(!!user);
  const incomesQuery = useIncomes(!!user);
  const settingsQuery = useProjectionSettings(!!user);
  const loading =
    expensesQuery.isLoading ||
    cardsQuery.isLoading ||
    incomesQuery.isLoading ||
    settingsQuery.isLoading;

  const spending = buildSpending(expensesQuery.data ?? [], cardsQuery.data ?? []);
  const incomes = incomesQuery.data ?? [];
  const settings = settingsQuery.data;
  const currentYear = new Date().getFullYear();

  // renda mensal = soma das fontes ja ativas (rendas futuras so contam a partir do startYear)
  const monthlyIncome = incomes
    .filter((i) => i.startYear == null || i.startYear <= currentYear)
    .reduce((sum, i) => sum + i.monthlyAmount, 0);

  const input: InsightsInput = {
    monthlyIncome,
    monthlyExpenses: spending.total,
    netWorth,
    spendingBreakdown: spending.items.map((i) => ({ name: i.name, value: i.value })),
    assetBreakdown: assetBreakdown.map((a) => ({ name: a.name, value: a.value })),
    incomeSources: incomes.map((i) => ({
      name: i.name,
      monthlyAmount: i.monthlyAmount,
      annualGrowthPct: i.annualGrowthPct,
      startYear: i.startYear,
    })),
    returnRatePct: settings?.returnRatePct ?? 10,
    horizonYears: settings?.horizonYears ?? 5,
  };

  // so dispara quando gasto, fontes e premissas ja carregaram (evita chamada incompleta)
  return useInsights(input, !!user && !loading);
}
