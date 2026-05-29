import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type EvolutionStep = { label: string; percent: number; status: string };
export type ProjectionPoint = { year: string; value: number };

export type Insights = {
  healthScore: number;
  status: string;
  insight: string;
  steps: EvolutionStep[];
  projection5y: ProjectionPoint[];
};

export type InsightsInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
};

// calcula saude financeira + projecao via Gemini (backend).
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
