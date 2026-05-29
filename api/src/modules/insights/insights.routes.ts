import type { FastifyInstance } from "fastify";
import { env } from "../../env.js";
import { authenticate } from "../../plugins/auth.js";
import { generateInsights } from "./gemini.js";
import { insightsRequestSchema } from "./insights.schemas.js";

export async function insightsRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    if (!env.GEMINI_API_KEY) {
      return reply.code(503).send({ error: "Insights indisponivel: GEMINI_API_KEY nao configurada" });
    }

    const parsed = insightsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }

    try {
      const result = await generateInsights(parsed.data, env.GEMINI_API_KEY);
      return reply.send(result);
    } catch (err) {
      // mensagem na propria linha do log pra aparecer direto no Railway, alem do err estruturado
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao gerar insights do gemini: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel gerar os insights agora" });
    }
  });
}
