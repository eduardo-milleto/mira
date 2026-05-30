import type { FastifyInstance } from "fastify";
import type { AssistantMessage } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { authenticate } from "../../plugins/auth.js";
import { assistantMessageSchema } from "./assistant.schemas.js";
import { runAssistant, type ChatTurn } from "./gemini.js";

// quantos turnos do historico mandamos pro modelo (limita custo/tokens), igual ao advisor
const HISTORY_LIMIT = 20;

// AssistantMessage do Prisma -> shape simples na borda da API
function publicMessage(m: AssistantMessage) {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt };
}

export async function assistantRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida
  app.addHook("preHandler", authenticate);

  // historico do chat do assistente
  app.get("/messages", async (request, reply) => {
    // user e assistant do mesmo turno compartilham o createdAt (now() fixo por transacao);
    // o desempate por role desc ("user" > "assistant") mantem a pergunta antes da resposta
    const messages = await prisma.assistantMessage.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ createdAt: "asc" }, { role: "desc" }],
    });
    return reply.send({ messages: messages.map(publicMessage) });
  });

  app.delete("/messages", async (request, reply) => {
    await prisma.assistantMessage.deleteMany({ where: { userId: request.user.sub } });
    return reply.code(204).send();
  });

  // chat com streaming (SSE). a resposta sai token a token; no meio podem aparecer eventos
  // de "tool" (a IA consultou o banco) e "reset" (limpar preambulo). ao fim, "done" traz as
  // mensagens persistidas; "error" sinaliza falha.
  app.post("/chat", async (request, reply) => {
    if (!env.GEMINI_API_KEY) {
      return reply.code(503).send({ error: "Assistente indisponivel: GEMINI_API_KEY nao configurada" });
    }
    const parsed = assistantMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }

    const userId = request.user.sub;
    const now = new Date();

    // ultimos N turnos em ordem cronologica (busca os mais novos e reinverte). role asc no
    // desempate pra que, ao reverter, "user" venha antes de "assistant" no mesmo turno.
    const recent = await prisma.assistantMessage.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { role: "asc" }],
      take: HISTORY_LIMIT,
    });
    const history: ChatTurn[] = recent
      .reverse()
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    // a partir daqui assumimos a resposta crua (SSE). hijack impede o Fastify de responder e
    // tambem pula o hook de CORS — por isso setamos os headers de CORS na mao (precisa ser a
    // origem especifica, nao '*', porque o fetch vai com credentials: include).
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // evita buffering em proxy (nginx) que quebraria o streaming
      "Access-Control-Allow-Origin": env.CORS_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });

    // se o cliente fechar a aba/cancelar, abortamos o loop e paramos de gastar com o Gemini
    const ac = new AbortController();
    reply.raw.on("close", () => ac.abort());

    const send = (event: string, data: unknown) => {
      if (reply.raw.writableEnded || reply.raw.destroyed) return;
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const finalText = await runAssistant(
        userId,
        history,
        parsed.data.content,
        env.GEMINI_API_KEY,
        now,
        (e) => {
          if (e.type === "token") send("token", { text: e.text });
          else if (e.type === "tool") send("tool", { name: e.name });
          else if (e.type === "reset") send("reset", {});
        },
        ac.signal,
      );

      // so persiste apos sucesso — evita pergunta orfa (sem resposta) no historico
      const [userMessage, assistantMessage] = await prisma.$transaction([
        prisma.assistantMessage.create({ data: { userId, role: "user", content: parsed.data.content } }),
        prisma.assistantMessage.create({ data: { userId, role: "assistant", content: finalText } }),
      ]);

      send("done", {
        userMessage: publicMessage(userMessage),
        assistantMessage: publicMessage(assistantMessage),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha no assistente: ${detail}`);
      send("error", { error: "Nao foi possivel responder agora" });
    } finally {
      if (!reply.raw.writableEnded) reply.raw.end();
    }
  });
}
