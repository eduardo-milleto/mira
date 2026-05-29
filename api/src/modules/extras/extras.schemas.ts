import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas (mesmo padrao dos outros modulos)
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// data do movimento no formato "YYYY-MM-DD" (sem horario). guardamos como meia-noite UTC
// pra que a soma por mes seja consistente independente do fuso do servidor.
const occurredAt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (use AAAA-MM-DD)");

// ganho extra (entrou) ou gasto extra (saiu) amarrado a um mes especifico
export const extraCreateSchema = z.object({
  kind: z.enum(["ganho", "gasto"]),
  description: z.string().trim().min(1, "Informe a descricao").max(80),
  category: z.string().trim().max(60).optional(),
  amount: money,
  occurredAt,
});

// no update tudo opcional, mas precisa vir pelo menos um campo
export const extraUpdateSchema = extraCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

export type ExtraCreateInput = z.infer<typeof extraCreateSchema>;
export type ExtraUpdateInput = z.infer<typeof extraUpdateSchema>;
