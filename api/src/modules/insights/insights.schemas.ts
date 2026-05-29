import { z } from "zod";

const breakdownItem = z.object({ name: z.string(), value: z.number() });

// entrada: numeros do mes + quebras por categoria (pra recomendacao ser especifica)
export const insightsRequestSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  netWorth: z.number(),
  spendingBreakdown: z.array(breakdownItem).optional().default([]),
  assetBreakdown: z.array(breakdownItem).optional().default([]),
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
  projection5y: z
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
