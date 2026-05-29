import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
};

export type CreditCard = {
  id: string;
  name: string;
  bank: string;
  avgMonthlySpend: number;
  includeInMonthly: boolean;
  createdAt: string;
};

export type ExpenseInput = { name: string; amount: number };
export type CardInput = {
  name: string;
  bank: string;
  avgMonthlySpend: number;
  includeInMonthly: boolean;
};

export const expensesKey = ["expenses"] as const;
export const cardsKey = ["cards"] as const;

// ---------- gastos ----------
export function useExpenses(enabled = true) {
  return useQuery({
    queryKey: expensesKey,
    queryFn: () => api.get<{ expenses: Expense[] }>("/gastos/expenses").then((r) => r.expenses),
    enabled,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      api.post<{ expense: Expense }>("/gastos/expenses", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExpenseInput> }) =>
      api.patch<{ expense: Expense }>(`/gastos/expenses/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<null>(`/gastos/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey }),
  });
}

// ---------- cartoes ----------
export function useCreditCards(enabled = true) {
  return useQuery({
    queryKey: cardsKey,
    queryFn: () => api.get<{ cards: CreditCard[] }>("/gastos/cards").then((r) => r.cards),
    enabled,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CardInput) => api.post<{ card: CreditCard }>("/gastos/cards", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CardInput> }) =>
      api.patch<{ card: CreditCard }>(`/gastos/cards/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<null>(`/gastos/cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey }),
  });
}
