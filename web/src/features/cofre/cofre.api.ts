import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type MovementDirection = "entrada" | "saida";

// source: "sobra" (fechamento do mes) | "gasto_extra" | "ajuste" | "aporte" (Fase 2)
export type CofreMovement = {
  id: string;
  direction: MovementDirection;
  source: string;
  amount: number;
  notes: string | null;
  occurredAt: string; // "YYYY-MM-DD"
  investmentId: string | null;
  createdAt: string;
};

export type MonthClose = {
  id: string;
  month: string; // "YYYY-MM"
  computedSurplus: number;
  confirmedSurplus: number;
  reason: string | null;
  confirmedAt: string;
};

export type PendingMonth = { month: string; computedSurplus: number };

export type CofreData = {
  balance: number;
  movements: CofreMovement[];
  closes: MonthClose[];
  pendingMonths: PendingMonth[];
};

export type MovementInput = {
  direction: MovementDirection;
  amount: number;
  occurredAt: string;
  notes?: string;
};

export type MonthCloseInput = {
  month: string;
  confirmedSurplus: number;
  reason?: string;
};

export const cofreKey = ["cofre"] as const;

// saldo + movimentacoes + fechamentos + meses pendentes de confirmacao
export function useCofre(enabled = true) {
  return useQuery({
    queryKey: cofreKey,
    queryFn: () => api.get<CofreData>("/cofre"),
    enabled,
  });
}

// qualquer movimento/fechamento mexe no saldo e no contexto financeiro da IA — invalida os dois
function useCofreMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cofreKey });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

export function useCreateMovement() {
  return useCofreMutation((input: MovementInput) =>
    api.post<{ movement: CofreMovement }>("/cofre/movements", input),
  );
}

export function useUpdateMovement() {
  return useCofreMutation(({ id, input }: { id: string; input: Partial<MovementInput> }) =>
    api.patch<{ movement: CofreMovement }>(`/cofre/movements/${id}`, input),
  );
}

export function useDeleteMovement() {
  return useCofreMutation((id: string) => api.del<null>(`/cofre/movements/${id}`));
}

export function useConfirmMonthClose() {
  return useCofreMutation((input: MonthCloseInput) =>
    api.post<{ ok: true }>("/cofre/closes", input),
  );
}
