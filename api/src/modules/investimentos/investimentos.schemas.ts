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

// aporte mensal planejado: nao negativo (0/null = sem aporte), mesmo teto dos valores
const contribution = z
  .number()
  .min(0, "Valor invalido")
  .max(1_000_000_000, "Valor muito alto");

// patrimonio = bens (imovel, veiculo); investimento = ativos financeiros/renda passiva
const investmentKind = z.enum(["investimento", "patrimonio"]);

// --- investimentos ---
export const investmentCreateSchema = z.object({
  kind: investmentKind.optional().default("investimento"),
  name: z.string().trim().min(1, "Informe o nome").max(80),
  category: z.string().trim().min(1, "Informe a categoria").max(40),
  value: money,
  // vazio (omitido ou null) = ativo nao rende na projecao (0% ao ano); a IA nao infere taxa
  expectedReturnPct: pct.nullish(),
  // aporte mensal planejado que alimenta a projecao (so concretiza com evento de aporte real)
  monthlyContribution: contribution.nullish(),
  notes: z.string().trim().max(500).nullish(),
});

// override direto do valor atual na edicao: a diferenca pro valor de hoje e jogada no evento
// saldo_inicial (na rota), pra nao sujar a linha do tempo com um evento novo. aceita 0 (ativo
// zerado), diferente do cadastro que exige valor positivo
const valueOverride = z
  .number()
  .min(0, "Valor invalido")
  .max(1_000_000_000, "Valor muito alto");

// no update tudo opcional, mas precisa vir pelo menos um campo. value aqui e overwrite direto
// (ajusta o saldo_inicial), enquanto aporte/rendimento/resgate/valorizacao/depreciacao continuam
// passando pelos eventos. expectedReturnPct e notes aceitam null pra "limpar" a premissa
export const investmentUpdateSchema = z
  .object({
    kind: investmentKind,
    name: z.string().trim().min(1, "Informe o nome").max(80),
    category: z.string().trim().min(1, "Informe a categoria").max(40),
    value: valueOverride,
    expectedReturnPct: pct.nullable(),
    monthlyContribution: contribution.nullable(),
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
