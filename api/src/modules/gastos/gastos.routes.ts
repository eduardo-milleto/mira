import type { FastifyInstance } from "fastify";
import type { Expense, CreditCard } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  cardCreateSchema,
  cardUpdateSchema,
} from "./gastos.schemas.js";

// Decimal do Prisma -> number na borda da API (front trabalha com reais como number)
function publicExpense(e: Expense) {
  return { id: e.id, name: e.name, amount: e.amount.toNumber(), createdAt: e.createdAt };
}

function publicCard(c: CreditCard) {
  return {
    id: c.id,
    name: c.name,
    bank: c.bank,
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
        bank: parsed.data.bank,
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
}
