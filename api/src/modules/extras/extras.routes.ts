import type { FastifyInstance } from "fastify";
import type { Extra } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import { monthRange } from "../../lib/month.js";
import { extraCreateSchema, extraUpdateSchema } from "./extras.schemas.js";

// "YYYY-MM-DD" -> Date na meia-noite UTC (data de calendario, sem horario)
function parseOccurredAt(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// normaliza categoria: texto vazio/whitespace vira null (campo opcional no banco)
function normalizeCategory(category: string | undefined): string | null {
  return category && category.length > 0 ? category : null;
}

// Decimal/Date do Prisma -> tipos simples na borda da API
function publicExtra(e: Extra) {
  return {
    id: e.id,
    kind: e.kind,
    description: e.description,
    category: e.category,
    amount: e.amount.toNumber(),
    occurredAt: e.occurredAt.toISOString().slice(0, 10),
    createdAt: e.createdAt,
  };
}

export async function extrasRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // lista os extras do usuario, opcionalmente filtrando por tipo (kind) e/ou mes
  app.get("/", async (request, reply) => {
    const { kind, month } = request.query as { kind?: string; month?: string };
    const where: { userId: string; kind?: string; occurredAt?: { gte: Date; lt: Date } } = {
      userId: request.user.sub,
    };
    if (kind === "ganho" || kind === "gasto") where.kind = kind;
    if (month) {
      const { start, end } = monthRange(month, new Date());
      where.occurredAt = { gte: start, lt: end };
    }
    const extras = await prisma.extra.findMany({ where, orderBy: { occurredAt: "desc" } });
    return reply.send({ extras: extras.map(publicExtra) });
  });

  // total de ganhos e gastos extras do mes (default = mes atual), calculado no servidor em UTC
  app.get("/summary", async (request, reply) => {
    const { month } = request.query as { month?: string };
    const { start, end } = monthRange(month, new Date());
    const extras = await prisma.extra.findMany({
      where: { userId: request.user.sub, occurredAt: { gte: start, lt: end } },
    });
    let ganhoTotal = 0;
    let gastoTotal = 0;
    for (const e of extras) {
      const value = e.amount.toNumber();
      if (e.kind === "ganho") ganhoTotal += value;
      else gastoTotal += value;
    }
    return reply.send({ ganhoTotal, gastoTotal });
  });

  app.post("/", async (request, reply) => {
    const parsed = extraCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const extra = await prisma.extra.create({
      data: {
        userId: request.user.sub,
        kind: parsed.data.kind,
        description: parsed.data.description,
        category: normalizeCategory(parsed.data.category),
        amount: parsed.data.amount,
        occurredAt: parseOccurredAt(parsed.data.occurredAt),
      },
    });
    return reply.code(201).send({ extra: publicExtra(extra) });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = extraUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // monta o data convertendo os campos especiais (categoria vazia -> null, data -> Date)
    const { occurredAt, category, ...rest } = parsed.data;
    const data = {
      ...rest,
      ...(category !== undefined ? { category: normalizeCategory(category) } : {}),
      ...(occurredAt ? { occurredAt: parseOccurredAt(occurredAt) } : {}),
    };
    // updateMany escopado por userId evita IDOR (mexer no lancamento de outro usuario)
    const result = await prisma.extra.updateMany({ where: { id, userId: request.user.sub }, data });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Lancamento nao encontrado" });
    }
    const extra = await prisma.extra.findUnique({ where: { id } });
    if (!extra) {
      return reply.code(404).send({ error: "Lancamento nao encontrado" });
    }
    return reply.send({ extra: publicExtra(extra) });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.extra.deleteMany({ where: { id, userId: request.user.sub } });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Lancamento nao encontrado" });
    }
    return reply.code(204).send();
  });
}
