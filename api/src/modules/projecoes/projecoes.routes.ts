import type { FastifyInstance } from "fastify";
import type { IncomeSource, ProjectionSettings } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import {
  incomeCreateSchema,
  incomeUpdateSchema,
  settingsSchema,
} from "./projecoes.schemas.js";

// defaults das premissas pra quem ainda nao salvou nada (sem criar linha no banco)
const DEFAULT_RETURN_RATE = 10;
const DEFAULT_HORIZON = 5;

// Decimal do Prisma -> number na borda da API (front trabalha com reais/percentual como number)
function publicIncome(i: IncomeSource) {
  return {
    id: i.id,
    name: i.name,
    monthlyAmount: i.monthlyAmount.toNumber(),
    annualGrowthPct: i.annualGrowthPct.toNumber(),
    startYear: i.startYear,
    createdAt: i.createdAt,
  };
}

function publicSettings(s: ProjectionSettings) {
  return { returnRatePct: s.returnRatePct.toNumber(), horizonYears: s.horizonYears };
}

export async function projecoesRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // ---------- fontes de renda ----------
  app.get("/incomes", async (request, reply) => {
    const incomes = await prisma.incomeSource.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ incomes: incomes.map(publicIncome) });
  });

  app.post("/incomes", async (request, reply) => {
    const parsed = incomeCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const income = await prisma.incomeSource.create({
      data: {
        userId: request.user.sub,
        name: parsed.data.name,
        monthlyAmount: parsed.data.monthlyAmount,
        annualGrowthPct: parsed.data.annualGrowthPct,
        startYear: parsed.data.startYear ?? null,
      },
    });
    return reply.code(201).send({ income: publicIncome(income) });
  });

  app.patch("/incomes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = incomeUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // updateMany escopado por userId evita IDOR (mexer na renda de outro usuario)
    const result = await prisma.incomeSource.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Fonte de renda nao encontrada" });
    }
    const income = await prisma.incomeSource.findUnique({ where: { id } });
    if (!income) {
      return reply.code(404).send({ error: "Fonte de renda nao encontrada" });
    }
    return reply.send({ income: publicIncome(income) });
  });

  app.delete("/incomes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.incomeSource.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Fonte de renda nao encontrada" });
    }
    return reply.code(204).send();
  });

  // ---------- premissas globais ----------
  app.get("/settings", async (request, reply) => {
    const settings = await prisma.projectionSettings.findUnique({
      where: { userId: request.user.sub },
    });
    // sem linha ainda = devolve os defaults sem persistir
    if (!settings) {
      return reply.send({
        settings: { returnRatePct: DEFAULT_RETURN_RATE, horizonYears: DEFAULT_HORIZON },
      });
    }
    return reply.send({ settings: publicSettings(settings) });
  });

  app.patch("/settings", async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // upsert: na criacao completa os campos ausentes com os defaults
    const settings = await prisma.projectionSettings.upsert({
      where: { userId: request.user.sub },
      create: {
        userId: request.user.sub,
        returnRatePct: parsed.data.returnRatePct ?? DEFAULT_RETURN_RATE,
        horizonYears: parsed.data.horizonYears ?? DEFAULT_HORIZON,
      },
      update: parsed.data,
    });
    return reply.send({ settings: publicSettings(settings) });
  });
}
