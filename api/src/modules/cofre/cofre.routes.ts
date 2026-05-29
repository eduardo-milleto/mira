import type { FastifyInstance } from "fastify";
import type { CofreMovement, MonthClose } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import { monthRange } from "../../lib/month.js";
import {
  monthCloseSchema,
  movementCreateSchema,
  movementUpdateSchema,
} from "./cofre.schemas.js";

// "YYYY-MM-DD" -> Date na meia-noite UTC (data de calendario, sem horario)
function parseOccurredAt(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// "YYYY-MM" do mes atual em UTC
function currentMonthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ultimo dia do mes "YYYY-MM" como data de calendario UTC (usado na data da entrada de sobra).
// Date.UTC(y, m, 0): dia 0 do mes seguinte (m e 1-based aqui) = ultimo dia do mes pedido
function lastDayOf(month: string): Date {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Date(Date.UTC(y, m, 0));
}

// arredonda pra 2 casas pra cortar ruido de ponto flutuante na soma de valores
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// meses COMPLETOS de startMonth (inclusive) ate o mes atual (exclusivo), em ordem crescente.
// um mes so fecha no 1o dia do mes seguinte, entao o mes corrente nunca entra na lista.
function completedMonthsSince(startMonth: string, now: Date): string[] {
  const cur = currentMonthKey(now);
  const months: string[] = [];
  let year = Number(startMonth.slice(0, 4));
  let month = Number(startMonth.slice(5, 7));
  // guarda de seguranca: no maximo 600 meses (50 anos) pra nunca girar infinito
  for (let i = 0; i < 600; i++) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (key >= cur) break; // chegou no mes atual: nao fecha ainda
    months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// sobra calculada de um mes = ganhos do mes - gastos do mes. ganhos = renda recorrente ativa
// naquele ano + ganhos extras do mes; gastos = fixos + cartoes marcados + gastos pessoais do
// mes + gastos extras do mes. mesma logica do "Resultado do mes" da Visao geral, no servidor
// pra ser autoritativa (a IA confia nesse computedSurplus pra detectar movimento fora do app).
async function computeSurplus(userId: string, month: string, now: Date): Promise<number> {
  const { start, end } = monthRange(month, now);
  const year = Number(month.slice(0, 4));
  const [incomes, expenses, cards, personal, extras] = await Promise.all([
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.creditCard.findMany({ where: { userId } }),
    prisma.personalExpense.findMany({ where: { userId, spentAt: { gte: start, lt: end } } }),
    prisma.extra.findMany({ where: { userId, occurredAt: { gte: start, lt: end } } }),
  ]);

  // renda ativa = sem startYear ou ja vigente naquele ano (mesma regra do buildEarnings)
  const income = incomes
    .filter((i) => i.startYear == null || i.startYear <= year)
    .reduce((sum, i) => sum + i.monthlyAmount.toNumber(), 0);
  const recurringExpenses =
    expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0) +
    cards
      .filter((c) => c.includeInMonthly)
      .reduce((sum, c) => sum + c.avgMonthlySpend.toNumber(), 0);
  const personalTotal = personal.reduce((sum, p) => sum + p.amount.toNumber(), 0);

  let extrasGanho = 0;
  let extrasGasto = 0;
  for (const e of extras) {
    const value = e.amount.toNumber();
    if (e.kind === "ganho") extrasGanho += value;
    else extrasGasto += value;
  }

  return round2(income + extrasGanho - (recurringExpenses + personalTotal + extrasGasto));
}

// Decimal/Date do Prisma -> tipos simples na borda da API
function publicMovement(m: CofreMovement) {
  return {
    id: m.id,
    direction: m.direction,
    source: m.source,
    amount: m.amount.toNumber(),
    notes: m.notes,
    occurredAt: m.occurredAt.toISOString().slice(0, 10),
    investmentId: m.investmentId,
    createdAt: m.createdAt,
  };
}

function publicClose(c: MonthClose) {
  return {
    id: c.id,
    month: c.month,
    computedSurplus: c.computedSurplus.toNumber(),
    confirmedSurplus: c.confirmedSurplus.toNumber(),
    reason: c.reason,
    confirmedAt: c.confirmedAt,
  };
}

export async function cofreRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // saldo + movimentacoes + fechamentos + meses pendentes de confirmacao
  app.get("/", async (request, reply) => {
    const userId = request.user.sub;
    const now = new Date();

    // ancora do cofre: no 1o acesso comeca a acompanhar a partir do mes atual, pra nao
    // pedir fechamento de meses anteriores ao inicio do uso. upsert e idempotente e evita
    // corrida entre dois primeiros loads simultaneos (o @unique do userId estouraria)
    const state = await prisma.cofreState.upsert({
      where: { userId },
      create: { userId, startMonth: currentMonthKey(now) },
      update: {},
    });

    const [movements, closes] = await Promise.all([
      prisma.cofreMovement.findMany({ where: { userId }, orderBy: { occurredAt: "desc" } }),
      prisma.monthClose.findMany({ where: { userId }, orderBy: { month: "desc" } }),
    ]);

    // saldo unico continuo: soma das entradas menos as saidas
    const balance = round2(
      movements.reduce(
        (sum, m) => sum + (m.direction === "entrada" ? m.amount.toNumber() : -m.amount.toNumber()),
        0,
      ),
    );

    // meses completos ainda nao fechados = pendentes; calcula a sobra de cada um
    const closed = new Set(closes.map((c) => c.month));
    const pendingKeys = completedMonthsSince(state.startMonth, now).filter((m) => !closed.has(m));
    const pendingMonths = await Promise.all(
      pendingKeys.map(async (month) => ({
        month,
        computedSurplus: await computeSurplus(userId, month, now),
      })),
    );

    return reply.send({
      balance,
      movements: movements.map(publicMovement),
      closes: closes.map(publicClose),
      pendingMonths,
    });
  });

  app.post("/movements", async (request, reply) => {
    const parsed = movementCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const { direction, amount, occurredAt, notes } = parsed.data;
    const movement = await prisma.cofreMovement.create({
      data: {
        userId: request.user.sub,
        direction,
        // movimento manual: entrada = ajuste do saldo; saida = gasto extra que sai do cofre
        source: direction === "entrada" ? "ajuste" : "gasto_extra",
        amount,
        occurredAt: parseOccurredAt(occurredAt),
        notes: notes && notes.length > 0 ? notes : null,
      },
    });
    return reply.code(201).send({ movement: publicMovement(movement) });
  });

  app.patch("/movements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = movementUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // movimento de aporte/resgate (tem investmentId) e gerido pelo investimento, nao aqui
    const existing = await prisma.cofreMovement.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!existing) {
      return reply.code(404).send({ error: "Movimentacao nao encontrada" });
    }
    if (existing.investmentId) {
      return reply.code(409).send({ error: "Aporte/resgate e gerido pela tela de investimentos" });
    }
    const { direction, occurredAt, notes, ...rest } = parsed.data;
    const data = {
      ...rest,
      // ao trocar a direction, a source manual acompanha (ajuste <-> gasto_extra)
      ...(direction !== undefined
        ? { direction, source: direction === "entrada" ? "ajuste" : "gasto_extra" }
        : {}),
      ...(occurredAt ? { occurredAt: parseOccurredAt(occurredAt) } : {}),
      ...(notes !== undefined ? { notes: notes && notes.length > 0 ? notes : null } : {}),
    };
    // updateMany escopado por userId evita IDOR (mexer no movimento de outro usuario)
    const result = await prisma.cofreMovement.updateMany({
      where: { id, userId: request.user.sub },
      data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Movimentacao nao encontrada" });
    }
    const movement = await prisma.cofreMovement.findUnique({ where: { id } });
    if (!movement) {
      return reply.code(404).send({ error: "Movimentacao nao encontrada" });
    }
    return reply.send({ movement: publicMovement(movement) });
  });

  app.delete("/movements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    // aporte/resgate (com investmentId) so pode ser desfeito pela tela de investimentos
    const existing = await prisma.cofreMovement.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!existing) {
      return reply.code(404).send({ error: "Movimentacao nao encontrada" });
    }
    if (existing.investmentId) {
      return reply.code(409).send({ error: "Aporte/resgate e gerido pela tela de investimentos" });
    }
    const result = await prisma.cofreMovement.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Movimentacao nao encontrada" });
    }
    return reply.code(204).send();
  });

  // fecha um mes: grava o que o app calculou + o que o usuario confirmou (+ motivo se corrigiu)
  // e, quando sobrou (>0), credita a sobra no cofre — tudo numa transacao
  app.post("/closes", async (request, reply) => {
    const parsed = monthCloseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const { month, confirmedSurplus, reason } = parsed.data;
    const userId = request.user.sub;
    const now = new Date();

    // o mes precisa estar completo (so fecha no 1o dia do mes seguinte) e dentro do periodo
    // que o cofre acompanha
    const state = await prisma.cofreState.findUnique({ where: { userId } });
    const startMonth = state?.startMonth ?? currentMonthKey(now);
    if (!completedMonthsSince(startMonth, now).includes(month)) {
      return reply.code(400).send({ error: "Esse mes ainda nao pode ser fechado" });
    }

    // ja fechado? (o unique [userId, month] tambem barra, mas damos erro claro)
    const existing = await prisma.monthClose.findUnique({
      where: { userId_month: { userId, month } },
    });
    if (existing) {
      return reply.code(409).send({ error: "Esse mes ja foi fechado" });
    }

    // servidor recalcula o valor (autoritativo): nunca confia no computed vindo do cliente
    const computed = await computeSurplus(userId, month, now);
    const differs = Math.abs(confirmedSurplus - computed) > 0.005;
    if (differs && !(reason && reason.trim().length > 0)) {
      return reply.code(400).send({ error: "Informe o motivo da correcao" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.monthClose.create({
        data: {
          userId,
          month,
          computedSurplus: computed,
          confirmedSurplus,
          reason: differs ? reason!.trim() : null,
        },
      });
      // so credita no cofre quando de fato sobrou; deficit (<=0) so vira historico pra IA
      if (confirmedSurplus > 0) {
        await tx.cofreMovement.create({
          data: {
            userId,
            direction: "entrada",
            source: "sobra",
            amount: confirmedSurplus,
            occurredAt: lastDayOf(month),
            notes: `Sobra de ${month}`,
          },
        });
      }
    });

    return reply.code(201).send({ ok: true });
  });
}
