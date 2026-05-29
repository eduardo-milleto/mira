import { z } from "zod";

const breakdownItem = z.object({ name: z.string(), value: z.number() });

// fonte de renda com premissa de futuro: crescimento ao ano, ano de inicio (se futura)
// e valores definidos pra anos especificos (steps), que sobrescrevem o crescimento
const incomeSource = z.object({
  name: z.string(),
  monthlyAmount: z.number(),
  annualGrowthPct: z.number(),
  startYear: z.number().int().nullable().optional(),
  steps: z
    .array(z.object({ year: z.number().int(), monthlyAmount: z.number() }))
    .optional()
    .default([]),
});

// investimento que compoe o patrimonio, com premissa de rendimento por ativo
const investment = z.object({
  name: z.string(),
  category: z.string(),
  value: z.number(),
  expectedReturnPct: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// fechamento de mes confirmado: o que o app calculou vs o que o usuario confirmou.
// a diferenca (com motivo) revela ganho/gasto que passou FORA do app — contexto pra IA
const monthClose = z.object({
  month: z.string(),
  computedSurplus: z.number(),
  confirmedSurplus: z.number(),
  reason: z.string().nullable().optional(),
});

// entrada: numeros do mes + quebras por categoria (pra recomendacao ser especifica)
// + premissas de projecao (fontes de renda, taxa de rendimento, horizonte)
export const insightsRequestSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  netWorth: z.number(),
  spendingBreakdown: z.array(breakdownItem).optional().default([]),
  assetBreakdown: z.array(breakdownItem).optional().default([]),
  incomeSources: z.array(incomeSource).optional().default([]),
  investments: z.array(investment).optional().default([]),
  returnRatePct: z.number().optional(),
  horizonYears: z.number().int().min(1).max(30).optional().default(5),
  // saldo parado no cofre (caixa nao investida) + fechamentos de mes (contexto pra IA)
  cofreBalance: z.number().optional().default(0),
  monthCloses: z.array(monthClose).optional().default([]),
});

// saida esperada do Gemini (validada de forma defensiva antes de devolver)
export const insightsResponseSchema = z.object({
  healthScore: z.number().min(0).max(100),
  status: z.string().min(1),
  insight: z.string().min(1),
  steps: z
    .array(
      z.object({
        label: z.string().min(1),
        percent: z.number().min(0).max(100),
        status: z.string().min(1),
      }),
    )
    .min(1),
  projection: z
    .array(z.object({ year: z.string().min(1), value: z.number() }))
    .min(1),
  projectionExplanation: z.string().min(1),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.string().min(1),
      }),
    )
    .min(1),
});

export type InsightsRequest = z.infer<typeof insightsRequestSchema>;
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;
