import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type IncomeStep = { year: number; monthlyAmount: number };

export type IncomeSource = {
  id: string;
  name: string;
  monthlyAmount: number;
  annualGrowthPct: number;
  startYear: number | null;
  steps: IncomeStep[];
  createdAt: string;
};

export type ProjectionSettings = {
  returnRatePct: number;
  horizonYears: number;
};

export type IncomeInput = {
  name: string;
  monthlyAmount: number;
  annualGrowthPct: number;
  startYear: number | null;
  steps: IncomeStep[];
};

export type SettingsInput = Partial<ProjectionSettings>;

export const incomesKey = ["incomes"] as const;
export const projectionSettingsKey = ["projection-settings"] as const;

// ---------- fontes de renda ----------
export function useIncomes(enabled = true) {
  return useQuery({
    queryKey: incomesKey,
    queryFn: () =>
      api.get<{ incomes: IncomeSource[] }>("/projecoes/incomes").then((r) => r.incomes),
    enabled,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IncomeInput) =>
      api.post<{ income: IncomeSource }>("/projecoes/incomes", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey }),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<IncomeInput> }) =>
      api.patch<{ income: IncomeSource }>(`/projecoes/incomes/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<null>(`/projecoes/incomes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey }),
  });
}

// ---------- premissas globais ----------
export function useProjectionSettings(enabled = true) {
  return useQuery({
    queryKey: projectionSettingsKey,
    queryFn: () =>
      api.get<{ settings: ProjectionSettings }>("/projecoes/settings").then((r) => r.settings),
    enabled,
  });
}

export function useUpdateProjectionSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) =>
      api.patch<{ settings: ProjectionSettings }>("/projecoes/settings", input),
    onSuccess: (data) => qc.setQueryData(projectionSettingsKey, data.settings),
  });
}
