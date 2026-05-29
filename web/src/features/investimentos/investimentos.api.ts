import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type InvestmentKind = "investimento" | "patrimonio";

export type Investment = {
  id: string;
  kind: InvestmentKind;
  name: string;
  category: string;
  value: number;
  expectedReturnPct: number | null; // % manual (expectativa / fallback)
  realizedReturnPct: number | null; // % anualizada do historico real (null = histórico curto)
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
    onSuccess: () => {
      // ao excluir o ativo, os movimentos de aporte/resgate do cofre ficam avulsos (FK SetNull)
      qc.invalidateQueries({ queryKey: investmentsKey });
      qc.invalidateQueries({ queryKey: ["cofre"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

// --- eventos (linha do tempo) ---

export type InvestmentEventType =
  | "saldo_inicial"
  | "aporte"
  | "rendimento"
  | "resgate"
  | "valorizacao"
  | "depreciacao";

export type InvestmentEvent = {
  id: string;
  type: InvestmentEventType;
  delta: number;
  notes: string | null;
  occurredAt: string; // "YYYY-MM-DD"
  cofreMovementId: string | null;
  valueAfter: number; // valor do ativo apos o evento (calculado no backend)
  createdAt: string;
};

// value = valor movimentado (aporte/resgate) ou novo valor atual (rendimento/valorizacao/depreciacao)
export type InvestmentEventInput = {
  type: Exclude<InvestmentEventType, "saldo_inicial">;
  value: number;
  occurredAt: string;
  notes?: string;
};

export const investmentEventsKey = ["investment-events"] as const;

export function useInvestmentEvents(investmentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...investmentEventsKey, investmentId],
    queryFn: () =>
      api
        .get<{ events: InvestmentEvent[] }>(`/investimentos/investments/${investmentId}/events`)
        .then((r) => r.events),
    enabled: enabled && !!investmentId,
  });
}

// evento mexe no valor do ativo, no cofre (aporte/resgate) e na projecao — invalida todos
function useEventMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: investmentsKey });
      qc.invalidateQueries({ queryKey: investmentEventsKey });
      qc.invalidateQueries({ queryKey: ["cofre"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

export function useCreateInvestmentEvent() {
  return useEventMutation(({ investmentId, input }: { investmentId: string; input: InvestmentEventInput }) =>
    api.post<{ event: InvestmentEvent }>(`/investimentos/investments/${investmentId}/events`, input),
  );
}

export function useDeleteInvestmentEvent() {
  return useEventMutation(({ investmentId, eventId }: { investmentId: string; eventId: string }) =>
    api.del<null>(`/investimentos/investments/${investmentId}/events/${eventId}`),
  );
}
