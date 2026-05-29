import { z } from "zod";

// reais com 2 casas, teto pra evitar overflow (mesmo padrao dos outros modulos)
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// data do movimento "YYYY-MM-DD" (sem horario); guardada como meia-noite UTC
const occurredAt = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (use AAAA-MM-DD)");

// chave de mes "YYYY-MM"
const monthKey = z.string().regex(/^\d{4}-\d{2}$/, "Mes invalido (use AAAA-MM)");

// movimentacao manual do cofre: entrada (ajuste/aporte futuro) ou saida (gasto extra).
// a source e derivada da direction na rota — aqui o usuario so escolhe entrada/saida.
export const movementCreateSchema = z.object({
  direction: z.enum(["entrada", "saida"]),
  amount: money,
  occurredAt,
  notes: z.string().trim().max(200).optional(),
});

// no update tudo opcional, mas precisa vir pelo menos um campo
export const movementUpdateSchema = movementCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// fechamento de um mes. confirmedSurplus pode ser negativo quando o usuario confirma um mes
// que fechou no negativo (deficit); o servidor recalcula o computedSurplus e exige reason
// quando os dois diferem. so vira entrada no cofre quando confirmedSurplus > 0.
export const monthCloseSchema = z.object({
  month: monthKey,
  confirmedSurplus: z
    .number()
    .min(-1_000_000_000, "Valor invalido")
    .max(1_000_000_000, "Valor muito alto"),
  reason: z.string().trim().max(300).optional(),
});

export type MovementCreateInput = z.infer<typeof movementCreateSchema>;
export type MovementUpdateInput = z.infer<typeof movementUpdateSchema>;
export type MonthCloseInput = z.infer<typeof monthCloseSchema>;
