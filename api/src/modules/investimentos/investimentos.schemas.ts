import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// rentabilidade esperada ao ano: aceita negativo (ativo que desvaloriza) ate um teto sao
const pct = z
  .number()
  .min(-100, "Percentual invalido")
  .max(1000, "Percentual muito alto");

// --- investimentos ---
export const investmentCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  category: z.string().trim().min(1, "Informe a categoria").max(40),
  value: money,
  expectedReturnPct: pct.optional(), // omitido = a IA infere pela categoria/notes
  notes: z.string().trim().max(500).optional(),
});

// no update tudo opcional, mas precisa vir pelo menos um campo.
// expectedReturnPct e notes aceitam null pra "limpar" a premissa
export const investmentUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome").max(80),
    category: z.string().trim().min(1, "Informe a categoria").max(40),
    value: money,
    expectedReturnPct: pct.nullable(),
    notes: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

export type InvestmentCreateInput = z.infer<typeof investmentCreateSchema>;
export type InvestmentUpdateInput = z.infer<typeof investmentUpdateSchema>;
