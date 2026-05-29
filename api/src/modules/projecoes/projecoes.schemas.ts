import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// percentual ao ano: aceita negativo (renda que encolhe) ate um teto sao
const pct = z
  .number()
  .min(-100, "Percentual invalido")
  .max(1000, "Percentual muito alto");

// ano de inicio de uma renda futura (faixa generosa pra nao limitar o planejamento)
const year = z.number().int().min(2020).max(2100);

// valor mensal definido pra um ano futuro (sobrescreve o crescimento percentual)
const incomeStep = z.object({
  year,
  monthlyAmount: money,
});
const steps = z.array(incomeStep).max(50, "Maximo de 50 valores futuros");

// --- fontes de renda ---
export const incomeCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  monthlyAmount: money,
  annualGrowthPct: pct.optional().default(0),
  // aceita null (renda nao-futura) alem de ausente
  startYear: year.nullable().optional(),
  steps: steps.optional().default([]),
});

// no update tudo opcional, mas precisa vir pelo menos um campo.
// startYear aceita null pra "deixar de ser renda futura" (volta a ser ativa)
export const incomeUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome").max(80),
    monthlyAmount: money,
    annualGrowthPct: pct,
    startYear: year.nullable(),
    steps,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// --- premissas globais da projecao ---
export const settingsSchema = z
  .object({
    returnRatePct: z.number().min(0, "Taxa invalida").max(100, "Taxa muito alta"),
    horizonYears: z.number().int().min(1, "Minimo 1 ano").max(30, "Maximo 30 anos"),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

export type IncomeCreateInput = z.infer<typeof incomeCreateSchema>;
export type IncomeUpdateInput = z.infer<typeof incomeUpdateSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
