import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type ExtraKind = "ganho" | "gasto";

export type Extra = {
  id: string;
  kind: ExtraKind;
  description: string;
  category: string | null;
  amount: number;
  occurredAt: string; // "YYYY-MM-DD"
  createdAt: string;
};

export type ExtraInput = {
  kind: ExtraKind;
  description: string;
  category?: string;
  amount: number;
  occurredAt: string;
};

export type ExtrasSummary = { ganhoTotal: number; gastoTotal: number };

export const extrasKey = ["extras"] as const;
export const extrasSummaryKey = ["extras-summary"] as const;

// lista os extras de um tipo (ganho/gasto), opcionalmente de um mes ("YYYY-MM").
// a chave inclui os filtros pra nao colidir cache entre views/meses diferentes.
export function useExtras(kind: ExtraKind, month?: string, enabled = true) {
  return useQuery({
    queryKey: [...extrasKey, kind, month ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams({ kind });
      if (month) params.set("month", month);
      return api.get<{ extras: Extra[] }>(`/extras?${params.toString()}`).then((r) => r.extras);
    },
    enabled,
  });
}

// total de ganhos e gastos extras de um mes (default = mes atual no backend)
export function useExtrasSummary(month: string, enabled = true) {
  return useQuery({
    queryKey: [...extrasSummaryKey, month],
    queryFn: () => api.get<ExtrasSummary>(`/extras/summary?month=${month}`),
    enabled,
  });
}

// um extra muda a lista, o resumo do mes e o contexto financeiro da IA — invalida os tres
function useExtraMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: extrasKey });
      qc.invalidateQueries({ queryKey: extrasSummaryKey });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

export function useCreateExtra() {
  return useExtraMutation((input: ExtraInput) => api.post<{ extra: Extra }>("/extras", input));
}

export function useUpdateExtra() {
  return useExtraMutation(({ id, input }: { id: string; input: Partial<ExtraInput> }) =>
    api.patch<{ extra: Extra }>(`/extras/${id}`, input),
  );
}

export function useDeleteExtra() {
  return useExtraMutation((id: string) => api.del<null>(`/extras/${id}`));
}
