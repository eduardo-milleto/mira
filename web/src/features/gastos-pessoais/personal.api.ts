import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type PersonalExpense = {
  id: string;
  name: string;
  category: string;
  amount: number;
  spentAt: string; // "YYYY-MM-DD"
  createdAt: string;
};

export type PersonalExpenseInput = {
  name: string;
  category: string;
  amount: number;
  spentAt: string;
};

export type MonthSummary = {
  monthTotal: number;
  byCategory: { category: string; spent: number }[];
};

export type CategoryLimit = {
  id: string;
  category: string;
  amount: number;
  source: string; // "user" | "ai"
};

export type LimitSuggestion = { category: string; amount: number; reason: string };

export type AdvisorMessage = {
  id: string;
  role: string; // "user" | "assistant"
  content: string;
  createdAt: string;
};

export type Verdict = "pode" | "cuidado" | "evite" | "neutro";

export const personalExpensesKey = ["personal-expenses"] as const;
export const personalSummaryKey = ["personal-summary"] as const;
export const limitsKey = ["category-limits"] as const;
export const profileKey = ["spending-profile"] as const;
export const chatKey = ["advisor-chat"] as const;

// ---------- gastos pessoais ----------
export function usePersonalExpenses(enabled = true) {
  return useQuery({
    queryKey: personalExpensesKey,
    queryFn: () =>
      api.get<{ expenses: PersonalExpense[] }>("/personal/expenses").then((r) => r.expenses),
    enabled,
  });
}

export function usePersonalSummary(enabled = true) {
  return useQuery({
    queryKey: personalSummaryKey,
    queryFn: () => api.get<MonthSummary>("/personal/summary"),
    enabled,
  });
}

// gasto pessoal afeta a lista, o resumo do mes e o total mensal dos insights — invalida os tres
function useExpenseMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personalExpensesKey });
      qc.invalidateQueries({ queryKey: personalSummaryKey });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

export function useCreatePersonalExpense() {
  return useExpenseMutation((input: PersonalExpenseInput) =>
    api.post<{ expense: PersonalExpense }>("/personal/expenses", input),
  );
}

export function useUpdatePersonalExpense() {
  return useExpenseMutation(({ id, input }: { id: string; input: Partial<PersonalExpenseInput> }) =>
    api.patch<{ expense: PersonalExpense }>(`/personal/expenses/${id}`, input),
  );
}

export function useDeletePersonalExpense() {
  return useExpenseMutation((id: string) => api.del<null>(`/personal/expenses/${id}`));
}

// ---------- limites ----------
export function useLimits(enabled = true) {
  return useQuery({
    queryKey: limitsKey,
    queryFn: () => api.get<{ limits: CategoryLimit[] }>("/personal/limits").then((r) => r.limits),
    enabled,
  });
}

export function useUpsertLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { category: string; amount: number }) =>
      api.put<{ limit: CategoryLimit }>("/personal/limits", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: limitsKey }),
  });
}

export function useDeleteLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (category: string) =>
      api.del<null>(`/personal/limits/${encodeURIComponent(category)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: limitsKey }),
  });
}

export function useSuggestLimits() {
  return useMutation({
    // body {} de proposito: o backend (Fastify) rejeita POST com content-type json e corpo
    // vazio antes de chegar na rota; um objeto vazio satisfaz o parser sem exigir dados
    mutationFn: () => api.post<{ suggestions: LimitSuggestion[] }>("/personal/limits/suggest", {}),
  });
}

// ---------- perfil de gatilhos ----------
export function useProfile(enabled = true) {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api.get<{ triggers: string }>("/personal/profile").then((r) => r.triggers),
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (triggers: string) =>
      api.put<{ triggers: string }>("/personal/profile", { triggers }),
    onSuccess: (data) => qc.setQueryData(profileKey, data.triggers),
  });
}

// ---------- chat ----------
export function useChat(enabled = true) {
  return useQuery({
    queryKey: chatKey,
    queryFn: () => api.get<{ messages: AdvisorMessage[] }>("/personal/chat").then((r) => r.messages),
    enabled,
  });
}

export type SendMessageResponse = {
  userMessage: AdvisorMessage;
  assistantMessage: AdvisorMessage;
  verdict: Verdict;
};

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<SendMessageResponse>("/personal/chat", { content }),
    onSuccess: (data) => {
      // anexa as duas mensagens persistidas ao historico em cache
      qc.setQueryData<AdvisorMessage[]>(chatKey, (old = []) => [
        ...old,
        data.userMessage,
        data.assistantMessage,
      ]);
    },
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<null>("/personal/chat"),
    onSuccess: () => qc.setQueryData(chatKey, []),
  });
}
