import type { FastifyInstance } from "fastify";
import type { Expense, CreditCard } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { authenticate } from "../../plugins/auth.js";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  cardCreateSchema,
  cardUpdateSchema,
  expenseAreasSchema,
  normalizeName,
} from "./gastos.schemas.js";
import { classifyAreas } from "./areas.gemini.js";

// Decimal do Prisma -> number na borda da API (front trabalha com reais como number)
function publicExpense(e: Expense) {
  return { id: e.id, name: e.name, amount: e.amount.toNumber(), createdAt: e.createdAt };
}

function publicCard(c: CreditCard) {
  return {
    id: c.id,
    name: c.name,
    bank: c.bank,
    brand: c.brand,
    avgMonthlySpend: c.avgMonthlySpend.toNumber(),
    includeInMonthly: c.includeInMonthly,
    createdAt: c.createdAt,
  };
}

export async function gastosRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // ---------- gastos ----------
  app.get("/expenses", async (request, reply) => {
    const expenses = await prisma.expense.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ expenses: expenses.map(publicExpense) });
  });

  app.post("/expenses", async (request, reply) => {
    const parsed = expenseCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const expense = await prisma.expense.create({
      data: { userId: request.user.sub, name: parsed.data.name, amount: parsed.data.amount },
    });
    return reply.code(201).send({ expense: publicExpense(expense) });
  });

  app.patch("/expenses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = expenseUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // updateMany escopado por userId evita IDOR (mexer no gasto de outro usuario)
    const result = await prisma.expense.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    return reply.send({ expense: publicExpense(expense) });
  });

  app.delete("/expenses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.expense.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    return reply.code(204).send();
  });

  // ---------- cartoes de credito ----------
  app.get("/cards", async (request, reply) => {
    const cards = await prisma.creditCard.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ cards: cards.map(publicCard) });
  });

  app.post("/cards", async (request, reply) => {
    const parsed = cardCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const card = await prisma.creditCard.create({
      data: {
        userId: request.user.sub,
        name: parsed.data.name,
        bank: parsed.data.bank ?? null,
        brand: parsed.data.brand ?? null,
        avgMonthlySpend: parsed.data.avgMonthlySpend,
        includeInMonthly: parsed.data.includeInMonthly,
      },
    });
    return reply.code(201).send({ card: publicCard(card) });
  });

  app.patch("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = cardUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const result = await prisma.creditCard.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Cartao nao encontrado" });
    }
    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) {
      return reply.code(404).send({ error: "Cartao nao encontrado" });
    }
    return reply.send({ card: publicCard(card) });
  });

  app.delete("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.creditCard.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Cartao nao encontrado" });
    }
    return reply.code(204).send();
  });

  // ---------- areas de gasto (classificacao por IA) ----------
  // recebe os nomes dos gastos e devolve { nome -> area }. usa o cache por usuario
  // (ExpenseAreaMap) e so chama o Gemini pros nomes ainda nao vistos. a resposta vem
  // sempre keyed pelo nome ORIGINAL que o cliente mandou (o front faz areas[gasto.nome]).
  app.post("/expense-areas", async (request, reply) => {
    const parsed = expenseAreasSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const userId = request.user.sub;
    const { names } = parsed.data;

    // normaliza e dedupe: guarda um nome original "representante" por chave normalizada
    const repByNorm = new Map<string, string>();
    for (const name of names) {
      const norm = normalizeName(name);
      if (!repByNorm.has(norm)) repByNorm.set(norm, name);
    }
    const normKeys = [...repByNorm.keys()];

    // hits do cache: areas ja classificadas pra esses nomes
    const known = await prisma.expenseAreaMap.findMany({
      where: { userId, name: { in: normKeys } },
    });
    const areaByNorm = new Map<string, string>(known.map((k) => [k.name, k.area]));

    const unknownNorms = normKeys.filter((n) => !areaByNorm.has(n));

    if (unknownNorms.length && env.GEMINI_API_KEY) {
      // manda o nome original (com acento/maiuscula) pra IA classificar melhor
      const originals = unknownNorms.map((n) => repByNorm.get(n)!);
      try {
        const classified = await classifyAreas(originals, env.GEMINI_API_KEY);
        for (const norm of unknownNorms) {
          areaByNorm.set(norm, classified[repByNorm.get(norm)!] ?? "Outros");
        }
        // persiste so as classificacoes reais da IA. a gravacao nunca derruba a resposta:
        // se o banco falhar, loga e devolve as areas mesmo assim.
        try {
          await Promise.all(
            unknownNorms.map((norm) =>
              prisma.expenseAreaMap.upsert({
                where: { userId_name: { userId, name: norm } },
                create: { userId, name: norm, area: areaByNorm.get(norm)! },
                update: { area: areaByNorm.get(norm)! },
              }),
            ),
          );
        } catch (err) {
          request.log.error({ err }, "falha ao salvar cache de areas (segue sem cache)");
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, `falha ao classificar areas no gemini: ${detail}`);
        // degrada com elegancia: os desconhecidos viram "Outros" e NAO sao persistidos,
        // pra serem classificados de verdade quando a IA voltar a responder
      }
    }

    // resposta keyed pelo nome original; o que nao classificou (sem chave/erro) vira "Outros"
    const areas: Record<string, string> = {};
    for (const name of names) {
      areas[name] = areaByNorm.get(normalizeName(name)) ?? "Outros";
    }
    return reply.send({ areas });
  });
}
