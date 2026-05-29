import { z } from "zod";

// entrada: numeros financeiros do mes que o frontend manda pra calcular
export const insightsRequestSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  netWorth: z.number(),
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
    .array(
      z.object({
        year: z.string().min(1),
        value: z.number(),
      }),
    )
    .min(1),
});

export type InsightsRequest = z.infer<typeof insightsRequestSchema>;
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;
