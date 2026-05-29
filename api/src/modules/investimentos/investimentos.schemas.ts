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

// patrimonio = bens (imovel, veiculo); investimento = ativos financeiros/renda passiva
const investmentKind = z.enum(["investimento", "patrimonio"]);

// --- investimentos ---
export const investmentCreateSchema = z.object({
  kind: investmentKind.optional().default("investimento"),
  name: z.string().trim().min(1, "Informe o nome").max(80),
  category: z.string().trim().min(1, "Informe a categoria").max(40),
  value: money,
  // vazio (omitido ou null) = a IA infere pela categoria/notes
  expectedReturnPct: pct.nullish(),
  notes: z.string().trim().max(500).nullish(),
});

// no update tudo opcional, mas precisa vir pelo menos um campo.
// value saiu de proposito: a partir da Fase 2 o valor so muda via eventos (aporte/rendimento/
// resgate/valorizacao/depreciacao), nunca por overwrite direto. expectedReturnPct e notes
// aceitam null pra "limpar" a premissa
export const investmentUpdateSchema = z
  .object({
    kind: investmentKind,
    name: z.string().trim().min(1, "Informe o nome").max(80),
    category: z.string().trim().min(1, "Informe a categoria").max(40),
    expectedReturnPct: pct.nullable(),
    notes: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// tipos de evento que o usuario registra (saldo_inicial e interno, criado no cadastro)
export const investmentEventType = z.enum([
  "aporte",
  "rendimento",
  "resgate",
  "valorizacao",
  "depreciacao",
]);

const eventOccurredAt = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (use AAAA-MM-DD)");

// value = valor movimentado (aporte/resgate) OU novo valor atual do ativo (rendimento/
// valorizacao/depreciacao). a interpretacao e o calculo do delta acontecem na rota.
export const investmentEventCreateSchema = z.object({
  type: investmentEventType,
  value: z.number().min(0, "Valor invalido").max(1_000_000_000, "Valor muito alto"),
  occurredAt: eventOccurredAt,
  notes: z.string().trim().max(200).optional(),
});

export type InvestmentCreateInput = z.infer<typeof investmentCreateSchema>;
export type InvestmentUpdateInput = z.infer<typeof investmentUpdateSchema>;
export type InvestmentEventCreateInput = z.infer<typeof investmentEventCreateSchema>;
