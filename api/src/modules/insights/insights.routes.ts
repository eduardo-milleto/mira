import type { FastifyInstance } from "fastify";
import { env } from "../../env.js";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import { generateInsights } from "./gemini.js";
import { hashInput } from "./cache.js";
import { insightsRequestSchema, type InsightsResponse } from "./insights.schemas.js";

// quantas analises manter no cache por usuario. na pratica so duas ficam "vivas"
// (visao geral e investimentos); as antigas viram lixo quando algum dado muda.
const MAX_CACHE_PER_USER = 10;

export async function insightsRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.sub;

    const parsed = insightsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }

    // cache enderecado por conteudo: mesmo input no mesmo ano => mesma analise salva.
    const inputHash = hashInput(parsed.data, new Date().getFullYear());
    const cached = await prisma.insightsCache.findUnique({
      where: { userId_inputHash: { userId, inputHash } },
    });
    if (cached) {
      return reply.send(cached.result);
    }

    // so no miss precisamos da IA (uma analise ja salva e servida mesmo sem a chave)
    if (!env.GEMINI_API_KEY) {
      return reply.code(503).send({ error: "Insights indisponivel: GEMINI_API_KEY nao configurada" });
    }

    let result: InsightsResponse;
    try {
      result = await generateInsights(parsed.data, env.GEMINI_API_KEY);
    } catch (err) {
      // mensagem na propria linha do log pra aparecer direto no Railway, alem do err estruturado
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao gerar insights do gemini: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel gerar os insights agora" });
    }

    // salva pro proximo carregamento. a gravacao nunca derruba a resposta:
    // se o banco falhar, loga e devolve a analise mesmo assim.
    try {
      await prisma.insightsCache.upsert({
        where: { userId_inputHash: { userId, inputHash } },
        create: { userId, inputHash, result },
        update: { result },
      });
      // poda: mantem so as MAX_CACHE_PER_USER mais recentes; apaga o resto
      const stale = await prisma.insightsCache.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        skip: MAX_CACHE_PER_USER,
        select: { id: true },
      });
      if (stale.length) {
        await prisma.insightsCache.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
      }
    } catch (err) {
      request.log.error({ err }, "falha ao salvar cache de insights (segue sem cache)");
    }

    return reply.send(result);
  });
}
