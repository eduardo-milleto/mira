import { z } from "zod";

// mensagem que o usuario manda pro assistente. mesmo teto dos outros chats do app.
export const assistantMessageSchema = z.object({
  content: z.string().trim().min(1, "Escreva uma mensagem").max(2000, "Mensagem muito longa"),
});

export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;

// --- validacao dos argumentos que a IA passa pra cada ferramenta ---
// a IA pode alucinar argumentos; validamos tudo antes de tocar no banco. quando algo vem
// errado, a ferramenta devolve um erro legivel pra IA se corrigir na proxima rodada.

const monthKey = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "mes invalido (use AAAA-MM)");

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data invalida (use AAAA-MM-DD)");

// buscar: termo obrigatorio; mes e limite opcionais
export const buscarArgsSchema = z.object({
  termo: z.string().trim().min(1, "informe o termo da busca").max(80),
  mes: monthKey.optional(),
  limite: z.coerce.number().int().min(1).max(30).optional(),
});

// agregar_gastos: periodo e agrupamento, todos opcionais (defaults aplicados na ferramenta)
export const agregarGastosArgsSchema = z.object({
  de: dateKey.optional(),
  ate: dateKey.optional(),
  agrupar_por: z.enum(["categoria", "mes"]).optional(),
});

// avaliar_compra: valor obrigatorio; categoria/descricao ajudam a contextualizar
export const avaliarCompraArgsSchema = z.object({
  valor: z.coerce
    .number()
    .positive("o valor precisa ser maior que zero")
    .max(1_000_000_000, "valor muito alto"),
  categoria: z.string().trim().min(1).max(60).optional(),
  descricao: z.string().trim().min(1).max(120).optional(),
});
