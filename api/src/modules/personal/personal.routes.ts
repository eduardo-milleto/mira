import type { FastifyInstance } from "fastify";
import type { PersonalExpense, CategoryLimit, AdvisorMessage } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { authenticate } from "../../plugins/auth.js";
import { buildAdvisorContext } from "./context.js";
import { monthRange } from "../../lib/month.js";
import { runAdvisorChat, suggestLimits, type ChatTurn } from "./advisor.js";
import {
  personalExpenseCreateSchema,
  personalExpenseUpdateSchema,
  limitUpsertSchema,
  profileUpdateSchema,
  chatMessageSchema,
} from "./personal.schemas.js";

// quantos turnos do historico mandamos pro Gemini (limita custo/tokens)
const HISTORY_LIMIT = 20;

// "YYYY-MM-DD" -> Date na meia-noite UTC (data de calendario, sem horario)
function parseSpentAt(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// Decimal/Date do Prisma -> tipos simples na borda da API
function publicExpense(e: PersonalExpense) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    amount: e.amount.toNumber(),
    spentAt: e.spentAt.toISOString().slice(0, 10),
    createdAt: e.createdAt,
  };
}

function publicLimit(l: CategoryLimit) {
  return { id: l.id, category: l.category, amount: l.amount.toNumber(), source: l.source };
}

function publicMessage(m: AdvisorMessage) {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt };
}

export async function personalRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // ---------- gastos pessoais (log de compras) ----------
  app.get("/expenses", async (request, reply) => {
    const expenses = await prisma.personalExpense.findMany({
      where: { userId: request.user.sub },
      orderBy: { spentAt: "desc" },
    });
    return reply.send({ expenses: expenses.map(publicExpense) });
  });

  app.post("/expenses", async (request, reply) => {
    const parsed = personalExpenseCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const expense = await prisma.personalExpense.create({
      data: {
        userId: request.user.sub,
        name: parsed.data.name,
        category: parsed.data.category,
        amount: parsed.data.amount,
        spentAt: parseSpentAt(parsed.data.spentAt),
      },
    });
    return reply.code(201).send({ expense: publicExpense(expense) });
  });

  app.patch("/expenses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = personalExpenseUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    // monta o data convertendo spentAt (string) -> Date quando presente
    const { spentAt, ...rest } = parsed.data;
    const data = { ...rest, ...(spentAt ? { spentAt: parseSpentAt(spentAt) } : {}) };
    // updateMany escopado por userId evita IDOR (mexer no gasto de outro usuario)
    const result = await prisma.personalExpense.updateMany({
      where: { id, userId: request.user.sub },
      data,
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    const expense = await prisma.personalExpense.findUnique({ where: { id } });
    if (!expense) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    return reply.send({ expense: publicExpense(expense) });
  });

  app.delete("/expenses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.personalExpense.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Gasto nao encontrado" });
    }
    return reply.code(204).send();
  });

  // resumo do mes: total + soma por categoria (calculado no servidor, em UTC).
  // ?month=YYYY-MM filtra um mes especifico; sem o parametro usa o mes corrente.
  app.get("/summary", async (request, reply) => {
    const { month } = request.query as { month?: string };
    const { start, end } = monthRange(month, new Date());
    const expenses = await prisma.personalExpense.findMany({
      where: { userId: request.user.sub, spentAt: { gte: start, lt: end } },
    });
    const byCat = new Map<string, number>();
    let monthTotal = 0;
    for (const e of expenses) {
      const value = e.amount.toNumber();
      monthTotal += value;
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + value);
    }
    const byCategory = [...byCat.entries()]
      .map(([category, spent]) => ({ category, spent }))
      .sort((a, b) => b.spent - a.spent);
    return reply.send({ monthTotal, byCategory });
  });

  // ---------- limites por categoria ----------
  app.get("/limits", async (request, reply) => {
    const limits = await prisma.categoryLimit.findMany({
      where: { userId: request.user.sub },
      orderBy: { category: "asc" },
    });
    return reply.send({ limits: limits.map(publicLimit) });
  });

  // upsert do limite: define/ajusta o teto de uma categoria (sempre marcado como "user")
  app.put("/limits", async (request, reply) => {
    const parsed = limitUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const limit = await prisma.categoryLimit.upsert({
      where: { userId_category: { userId: request.user.sub, category: parsed.data.category } },
      create: {
        userId: request.user.sub,
        category: parsed.data.category,
        amount: parsed.data.amount,
        source: "user",
      },
      update: { amount: parsed.data.amount, source: "user" },
    });
    return reply.send({ limit: publicLimit(limit) });
  });

  app.delete("/limits/:category", async (request, reply) => {
    const { category } = request.params as { category: string };
    const result = await prisma.categoryLimit.deleteMany({
      where: { userId: request.user.sub, category },
    });
    if (result.count === 0) {
      return reply.code(404).send({ error: "Limite nao encontrado" });
    }
    return reply.code(204).send();
  });

  // sugestao de limites pela IA — devolve sem persistir (o usuario decide salvar)
  app.post("/limits/suggest", async (request, reply) => {
    if (!env.GEMINI_API_KEY) {
      return reply.code(503).send({ error: "IA indisponivel: GEMINI_API_KEY nao configurada" });
    }
    try {
      const ctx = await buildAdvisorContext(request.user.sub, new Date());
      const result = await suggestLimits(ctx, env.GEMINI_API_KEY);
      return reply.send(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao sugerir limites: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel sugerir limites agora" });
    }
  });

  // ---------- perfil de gatilhos ----------
  app.get("/profile", async (request, reply) => {
    const profile = await prisma.spendingProfile.findUnique({
      where: { userId: request.user.sub },
    });
    return reply.send({ triggers: profile?.triggers ?? "" });
  });

  app.put("/profile", async (request, reply) => {
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const profile = await prisma.spendingProfile.upsert({
      where: { userId: request.user.sub },
      create: { userId: request.user.sub, triggers: parsed.data.triggers },
      update: { triggers: parsed.data.triggers },
    });
    return reply.send({ triggers: profile.triggers });
  });

  // ---------- chat com a consultora ----------
  app.get("/chat", async (request, reply) => {
    // user e assistant do mesmo turno sao criados na mesma transacao e compartilham o
    // createdAt (now() e fixo por transacao); o desempate por role desc ("user" > "assistant")
    // garante que a pergunta sempre aparece antes da resposta.
    const messages = await prisma.advisorMessage.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ createdAt: "asc" }, { role: "desc" }],
    });
    return reply.send({ messages: messages.map(publicMessage) });
  });

  app.post("/chat", async (request, reply) => {
    if (!env.GEMINI_API_KEY) {
      return reply.code(503).send({ error: "Consultora indisponivel: GEMINI_API_KEY nao configurada" });
    }
    const parsed = chatMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }

    try {
      const ctx = await buildAdvisorContext(request.user.sub, new Date());
      // ultimos N turnos em ordem cronologica (busca os mais novos e reinverte).
      // role asc no desempate pra que, ao reverter, "user" venha antes de "assistant"
      // no mesmo turno (mesmo createdAt da transacao).
      const recent = await prisma.advisorMessage.findMany({
        where: { userId: request.user.sub },
        orderBy: [{ createdAt: "desc" }, { role: "asc" }],
        take: HISTORY_LIMIT,
      });
      const history: ChatTurn[] = recent
        .reverse()
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      const result = await runAdvisorChat(ctx, history, parsed.data.content, env.GEMINI_API_KEY);

      // so persiste apos sucesso do Gemini — evita mensagem do usuario orfa (sem resposta)
      const [userMessage, assistantMessage] = await prisma.$transaction([
        prisma.advisorMessage.create({
          data: { userId: request.user.sub, role: "user", content: parsed.data.content },
        }),
        prisma.advisorMessage.create({
          data: { userId: request.user.sub, role: "assistant", content: result.reply },
        }),
      ]);

      return reply.send({
        userMessage: publicMessage(userMessage),
        assistantMessage: publicMessage(assistantMessage),
        verdict: result.verdict,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha no chat da consultora: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel responder agora" });
    }
  });

  app.delete("/chat", async (request, reply) => {
    await prisma.advisorMessage.deleteMany({ where: { userId: request.user.sub } });
    return reply.code(204).send();
  });
}
