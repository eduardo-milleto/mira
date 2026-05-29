import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type InvestmentKind = "investimento" | "patrimonio";

export type Investment = {
  id: string;
  kind: InvestmentKind;
  name: string;
  category: string;
  value: number;
  expectedReturnPct: number | null;
  notes: string | null;
  createdAt: string;
};

export type InvestmentInput = {
  kind: InvestmentKind;
  name: string;
  category: string;
  value: number;
  expectedReturnPct: number | null;
  notes: string | null;
};

// kind defensivo: dado antigo (antes da coluna existir) conta como "investimento"
export function investmentKindOf(i: Investment): InvestmentKind {
  return i.kind ?? "investimento";
}

export const investmentsKey = ["investments"] as const;

export function useInvestments(enabled = true) {
  return useQuery({
    queryKey: investmentsKey,
    queryFn: () =>
      api.get<{ investments: Investment[] }>("/investimentos/investments").then((r) => r.investments),
    enabled,
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvestmentInput) =>
      api.post<{ investment: Investment }>("/investimentos/investments", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: investmentsKey }),
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<InvestmentInput> }) =>
      api.patch<{ investment: Investment }>(`/investimentos/investments/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: investmentsKey }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<null>(`/investimentos/investments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: investmentsKey }),
  });
}
