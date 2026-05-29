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
  projection5y: ProjectionPoint[];
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
