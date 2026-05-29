import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// --- gastos ---
export const expenseCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  amount: money,
});

// no update tudo opcional, mas precisa vir pelo menos um campo
export const expenseUpdateSchema = expenseCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// --- cartoes de credito ---
export const cardCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o apelido do cartao").max(80),
  bank: z.string().trim().min(1, "Informe o banco").max(40),
  avgMonthlySpend: money,
  includeInMonthly: z.boolean().optional().default(false),
});

// update sem o .default(false) do create: omitir um campo = nao mexer nele
export const cardUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o apelido do cartao").max(80),
    bank: z.string().trim().min(1, "Informe o banco").max(40),
    avgMonthlySpend: money,
    includeInMonthly: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type CardCreateInput = z.infer<typeof cardCreateSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
