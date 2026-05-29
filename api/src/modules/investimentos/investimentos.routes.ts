import type { FastifyInstance } from "fastify";
import type { Investment, InvestmentEvent } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import {
  investmentCreateSchema,
  investmentEventCreateSchema,
  investmentUpdateSchema,
} from "./investimentos.schemas.js";

// tipos de evento permitidos por kind: investimento move dinheiro (aporte/resgate) ou rende;
// patrimonio so valoriza/deprecia (nao toca no cofre)
const TYPES_BY_KIND: Record<string, string[]> = {
  investimento: ["aporte", "rendimento", "resgate"],
  patrimonio: ["valorizacao", "depreciacao"],
};

// "YYYY-MM-DD" -> Date meia-noite UTC (data de calendario)
function parseOccurredAt(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// data de hoje (UTC) como data de calendario, pro saldo inicial do cadastro
function todayDateUTC(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

function publicEvent(e: InvestmentEvent) {
  return {
    id: e.id,
    type: e.type,
    delta: e.delta.toNumber(),
    notes: e.notes,
    occurredAt: e.occurredAt.toISOString().slice(0, 10),
    cofreMovementId: e.cofreMovementId,
    createdAt: e.createdAt,
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
    // cadastro = investimento + 1o evento "saldo inicial" (delta = valor) na mesma transacao,
    // pra a timeline e o calculo de rentabilidade terem base desde o inicio
    const investment = await prisma.$transaction(async (tx) => {
      const created = await tx.investment.create({
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
      await tx.investmentEvent.create({
        data: {
          investmentId: created.id,
          userId: request.user.sub,
          type: "saldo_inicial",
          delta: parsed.data.value,
          occurredAt: todayDateUTC(),
        },
      });
      return created;
    });
    return reply.code(201).send({ investment: publicInvestment(investment) });
  });

  app.patch("/investments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = investmentUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // updateMany escopado por userId evita IDOR. value nao entra mais aqui (so via eventos)
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
    // cascata apaga os eventos; os CofreMovement de aporte/resgate ficam com investmentId null
    // (FK onDelete SetNull) — o dinheiro ja saiu/entrou do cofre, vira historico avulso
    const result = await prisma.investment.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }
    return reply.code(204).send();
  });

  // --- linha do tempo do ativo ---

  app.get("/investments/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const investment = await prisma.investment.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!investment) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }
    const events = await prisma.investmentEvent.findMany({
      where: { investmentId: id },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });
    // valor do ativo apos cada evento = soma acumulada dos deltas na ordem cronologica
    let running = 0;
    const withRunning = events.map((e) => {
      running = round2(running + e.delta.toNumber());
      return { ...publicEvent(e), valueAfter: running };
    });
    return reply.send({ events: withRunning });
  });

  app.post("/investments/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = investmentEventCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const userId = request.user.sub;
    const investment = await prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) {
      return reply.code(404).send({ error: "Investimento nao encontrado" });
    }

    const { type, value, occurredAt, notes } = parsed.data;
    const kind = investment.kind ?? "investimento";
    if (!(TYPES_BY_KIND[kind] ?? []).includes(type)) {
      return reply.code(400).send({ error: "Tipo de movimentacao invalido para esse ativo" });
    }

    const current = investment.value.toNumber();
    // calcula o delta conforme o tipo. aporte/resgate: value = valor movimentado; os demais:
    // value = novo valor atual do ativo, e o delta e a diferenca pro valor de hoje
    let delta: number;
    if (type === "aporte") {
      if (value <= 0) return reply.code(400).send({ error: "Informe um valor maior que zero" });
      delta = round2(value);
    } else if (type === "resgate") {
      if (value <= 0) return reply.code(400).send({ error: "Informe um valor maior que zero" });
      if (value > current) {
        return reply.code(400).send({ error: "Nao da pra resgatar mais que o valor do ativo" });
      }
      delta = -round2(value);
    } else {
      delta = round2(value - current);
      if (delta === 0) {
        return reply.code(400).send({ error: "Informe um valor diferente do atual" });
      }
      if (type === "valorizacao" && delta < 0) {
        return reply.code(400).send({ error: "Valorizacao precisa ser maior que o valor atual" });
      }
      if (type === "depreciacao" && delta > 0) {
        return reply.code(400).send({ error: "Depreciacao precisa ser menor que o valor atual" });
      }
    }

    const date = parseOccurredAt(occurredAt);
    const trimmedNotes = notes && notes.length > 0 ? notes : null;

    // aporte/resgate mexem no cofre: o movimento do cofre e o evento sao criados juntos (atomico),
    // e o valor do ativo e ajustado pelo delta. saldo do cofre pode ficar negativo (regra Fase 1)
    const event = await prisma.$transaction(async (tx) => {
      let cofreMovementId: string | null = null;
      if (type === "aporte") {
        const mov = await tx.cofreMovement.create({
          data: {
            userId,
            direction: "saida",
            source: "aporte",
            amount: value,
            occurredAt: date,
            investmentId: id,
            notes: `Aporte em ${investment.name}`,
          },
        });
        cofreMovementId = mov.id;
      } else if (type === "resgate") {
        const mov = await tx.cofreMovement.create({
          data: {
            userId,
            direction: "entrada",
            source: "resgate",
            amount: value,
            occurredAt: date,
            investmentId: id,
            notes: `Resgate de ${investment.name}`,
          },
        });
        cofreMovementId = mov.id;
      }
      const ev = await tx.investmentEvent.create({
        data: { investmentId: id, userId, type, delta, occurredAt: date, notes: trimmedNotes, cofreMovementId },
      });
      await tx.investment.update({ where: { id }, data: { value: { increment: delta } } });
      return ev;
    });

    return reply.code(201).send({ event: publicEvent(event) });
  });

  app.delete("/investments/:id/events/:eventId", async (request, reply) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const userId = request.user.sub;
    const event = await prisma.investmentEvent.findFirst({
      where: { id: eventId, investmentId: id, userId },
    });
    if (!event) {
      return reply.code(404).send({ error: "Evento nao encontrado" });
    }
    if (event.type === "saldo_inicial") {
      return reply.code(400).send({ error: "Nao da pra excluir o saldo inicial do ativo" });
    }

    // reverte: tira o delta do valor do ativo e apaga o movimento do cofre criado junto
    await prisma.$transaction(async (tx) => {
      await tx.investment.update({ where: { id }, data: { value: { decrement: event.delta } } });
      if (event.cofreMovementId) {
        await tx.cofreMovement.deleteMany({ where: { id: event.cofreMovementId, userId } });
      }
      await tx.investmentEvent.delete({ where: { id: eventId } });
    });
    return reply.code(204).send();
  });
}
