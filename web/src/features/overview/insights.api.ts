import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useSession } from "../auth/auth.api";
import { useCreditCards, useExpenses } from "../gastos/gastos.api";
import { buildSpending } from "../gastos/spending";
import { assetBreakdown, monthlyIncome, netWorth } from "./data";

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

export type InsightsInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  spendingBreakdown: BreakdownInput[];
  assetBreakdown: BreakdownInput[];
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

// monta o input dos insights a partir do gasto real (banco) + renda/patrimonio.
// usado na Visao geral, Sugestoes IA e Projecoes — mesmo input = mesmo cache.
export function useInsightsData() {
  const { data: user } = useSession();
  const expensesQuery = useExpenses(!!user);
  const cardsQuery = useCreditCards(!!user);
  const spendingLoading = expensesQuery.isLoading || cardsQuery.isLoading;
  const spending = buildSpending(expensesQuery.data ?? [], cardsQuery.data ?? []);

  const input: InsightsInput = {
    monthlyIncome,
    monthlyExpenses: spending.total,
    netWorth,
    spendingBreakdown: spending.items.map((i) => ({ name: i.name, value: i.value })),
    assetBreakdown: assetBreakdown.map((a) => ({ name: a.name, value: a.value })),
  };

  // so dispara quando o gasto real ja carregou (evita chamada com total 0 no load)
  return useInsights(input, !!user && !spendingLoading);
}
