import type { FastifyInstance } from "fastify";
import type { Investment } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import { investmentCreateSchema, investmentUpdateSchema } from "./investimentos.schemas.js";

// Decimal do Prisma -> number na borda da API (front trabalha com reais/percentual como number)
function publicInvestment(i: Investment) {
  return {
    id: i.id,
    kind: i.kind,
    name: i.name,
    category: i.category,
    value: i.value.toNumber(),
    expectedReturnPct: i.expectedReturnPct?.toNumber() ?? null,
    notes: i.notes,
    createdAt: i.createdAt,
  };
}

export async function investimentosRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  app.get("/investments", async (request, reply) => {
    const investments = await prisma.investment.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ investments: investments.map(publicInvestment) });
  });

  app.post("/investments", async (request, reply) => {
    const parsed = investmentCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const investment = await prisma.investment.create({
      data: {
        userId: request.user.sub,
        kind: parsed.data.kind,
        name: parsed.data.name,
        category: parsed.data.category,
        value: parsed.data.value,
        expectedReturnPct: parsed.data.expectedReturnPct ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
    return reply.code(201).send({ investment: publicInvestment(investment) });
  });

  app.patch("/investments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = investmentUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // updateMany escopado por userId evita IDOR (mexer no ativo de outro usuario)
    const result = await prisma.investment.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }
    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }
    return reply.send({ investment: publicInvestment(investment) });
  });

  app.delete("/investments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.investment.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }
    return reply.code(204).send();
  });
}
