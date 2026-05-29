import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas (mesmo padrao dos outros modulos)
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// data da compra no formato "YYYY-MM-DD" (sem horario). guardamos como meia-noite UTC
// pra que a soma por mes seja consistente independente do fuso do servidor.
const spentAt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (use AAAA-MM-DD)");

// --- gastos pessoais (log de compras) ---
export const personalExpenseCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  category: z.string().trim().min(1, "Informe a categoria").max(60),
  amount: money,
  spentAt,
});

// no update tudo opcional, mas precisa vir pelo menos um campo
export const personalExpenseUpdateSchema = personalExpenseCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// --- limite por categoria (upsert) ---
export const limitUpsertSchema = z.object({
  category: z.string().trim().min(1, "Informe a categoria").max(60),
  amount: money,
});

// --- perfil de gatilhos (upsert; texto pode ser vazio pra limpar) ---
export const profileUpdateSchema = z.object({
  triggers: z.string().trim().max(2000, "Texto muito longo"),
});

// --- mensagem do chat com a consultora ---
export const chatMessageSchema = z.object({
  content: z.string().trim().min(1, "Escreva uma mensagem").max(2000, "Mensagem muito longa"),
});

export type PersonalExpenseCreateInput = z.infer<typeof personalExpenseCreateSchema>;
export type PersonalExpenseUpdateInput = z.infer<typeof personalExpenseUpdateSchema>;
export type LimitUpsertInput = z.infer<typeof limitUpsertSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
