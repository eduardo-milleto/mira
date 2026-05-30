import { z } from "zod";

// teto pra evitar valores absurdos/overflow; reais com 2 casas
const money = z
  .number()
  .positive("Informe um valor maior que zero")
  .max(1_000_000_000, "Valor muito alto");

// --- gastos ---
export const expenseCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  amount: money,
});

// no update tudo opcional, mas precisa vir pelo menos um campo
export const expenseUpdateSchema = expenseCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

// --- cartoes de credito ---
// banco e bandeira sao individualmente opcionais (nullable); a regra "pelo menos
// um dos dois" e validada por refine. null = campo nao informado.
const bankField = z.string().trim().max(40).nullable();
const brandField = z.string().trim().max(40).nullable();

export const cardCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o apelido do cartao").max(80),
    bank: bankField.optional(),
    brand: brandField.optional(),
    avgMonthlySpend: money,
    includeInMonthly: z.boolean().optional().default(false),
  })
  .refine((d) => Boolean(d.bank || d.brand), {
    message: "Escolha um banco ou uma bandeira",
    path: ["bank"],
  });

// update sem o .default(false) do create: omitir um campo = nao mexer nele
export const cardUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o apelido do cartao").max(80),
    bank: bankField,
    brand: brandField,
    avgMonthlySpend: money,
    includeInMonthly: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar")
  // so checa "pelo menos um" quando o update realmente mexe em banco/bandeira
  .refine(
    (d) => {
      if (!("bank" in d) && !("brand" in d)) return true;
      return Boolean((d.bank ?? null) || (d.brand ?? null));
    },
    { message: "Escolha um banco ou uma bandeira", path: ["bank"] },
  );

// --- areas de gasto (classificacao por IA) ---
// lista fixa de areas amplas. fonte unica da verdade: alimenta o enum do Gemini e a
// validacao da resposta. o frontend nao conhece essa lista, so renderiza o que voltar.
export const AREAS = [
  "Moradia",
  "Transporte",
  "Alimentação",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas e Serviços",
  "Dívidas e Empréstimos",
  "Investimentos",
  "Outros",
] as const;

export type Area = (typeof AREAS)[number];
export const areaSchema = z.enum(AREAS);

// normaliza o nome do gasto pra casar no cache: tira espaco das pontas, minusculo e
// colapsa espacos internos. "  Mercado  Livre " e "mercado livre" viram a mesma chave.
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// body do POST /gastos/expense-areas: a lista de nomes (unicos) a classificar
export const expenseAreasSchema = z.object({
  names: z.array(z.string().trim().min(1).max(80)).max(200),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type CardCreateInput = z.infer<typeof cardCreateSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
