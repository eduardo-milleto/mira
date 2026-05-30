import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../plugins/auth.js";
import { computeSurplus, round2 } from "../../lib/surplus.js";
import {
  createConnectToken,
  deleteItem,
  getBankBalance,
  getItem,
  pluggyConfigured,
  pollUntilSettled,
  triggerUpdate,
} from "./pluggy.js";
import { connectSchema } from "./saldo-banco.schemas.js";

// "YYYY-MM" do mes atual em UTC (datas de calendario sao sempre em UTC neste projeto)
function currentMonthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 503 padrao quando faltam as credenciais do Pluggy (mesma ideia do /insights sem GEMINI)
function notConfigured(reply: FastifyReply) {
  return reply.code(503).send({ error: "Saldo no banco indisponivel: Pluggy nao configurado" });
}

// monta o estado completo da aba: conexao + saldo de hoje + ancora de inicio do mes +
// sobra do mes (reusa o computeSurplus do Cofre) + projecao de fim do mes.
// no caminho feliz rele item (status) e contas (saldo) do Pluggy — leituras baratas, sem
// forcar consulta ao banco; se o Pluggy falhar, degrada pro ultimo valor salvo.
async function buildState(userId: string, now: Date, log: FastifyBaseLogger) {
  const connection = await prisma.bankConnection.findUnique({ where: { userId } });
  if (!connection) return { connected: false as const };

  let currentBalance = connection.currentBalance.toNumber();
  let currentBalanceAt = connection.currentBalanceAt;
  let status = connection.status;
  let lastError = connection.lastError;

  if (pluggyConfigured()) {
    // status do item: pra UI saber se precisa reconectar (login/MFA). leitura independente
    // do saldo: se uma falhar, a outra ainda atualiza.
    try {
      const item = await getItem(connection.pluggyItemId);
      status = item.status;
      lastError = item.error?.message ?? null;
      await prisma.bankConnection.update({
        where: { userId },
        data: { status: item.status, lastError: item.error?.message ?? null },
      });
    } catch (err) {
      log.warn({ err }, "falha ao ler status do item no Pluggy");
    }
    // saldo de hoje (cache do Pluggy, sem custo de atualizacao)
    try {
      const total = await getBankBalance(connection.pluggyItemId);
      currentBalance = total;
      currentBalanceAt = now;
      await prisma.bankConnection.update({
        where: { userId },
        data: { currentBalance: total, currentBalanceAt: now },
      });
    } catch (err) {
      log.warn({ err }, "falha ao reler saldo no Pluggy (usando ultimo salvo)");
    }
  }

  // ancora "inicio do mes": cria a do mes corrente se ainda nao existe. partial = capturado
  // depois do dia 1 (conexao tardia), pra UI rotular "desde a conexao" sem fingir precisao.
  const month = currentMonthKey(now);
  const opening = await prisma.bankBalanceSnapshot.upsert({
    where: { userId_month: { userId, month } },
    create: {
      userId,
      connectionId: connection.id,
      month,
      openingBalance: currentBalance,
      partial: now.getUTCDate() > 1,
    },
    update: {},
  });
  const openingBalance = opening.openingBalance.toNumber();
  const monthSurplus = await computeSurplus(userId, month, now);

  return {
    connected: true as const,
    institutionName: connection.institutionName,
    status,
    lastError,
    currentBalance,
    currentBalanceAt,
    lastSyncedAt: connection.lastSyncedAt,
    month,
    openingBalance,
    partialOpening: opening.partial,
    monthSurplus,
    projectedEndBalance: round2(openingBalance + monthSurplus),
  };
}

export async function saldoBancoRoutes(app: FastifyInstance) {
  // todas as rotas exigem sessao valida; tudo escopado por request.user.sub
  app.addHook("preHandler", authenticate);

  // estado completo da aba (conexao + saldo + projecao do mes)
  app.get("/", async (request, reply) => {
    return reply.send(await buildState(request.user.sub, new Date(), request.log));
  });

  // token pro widget do Pluggy abrir. com conexao existente, abre em modo update (reconexao)
  app.post("/connect-token", async (request, reply) => {
    if (!pluggyConfigured()) return notConfigured(reply);
    const userId = request.user.sub;
    const existing = await prisma.bankConnection.findUnique({ where: { userId } });
    try {
      const connectToken = await createConnectToken(existing?.pluggyItemId);
      return reply.send({ connectToken });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao criar connect token do Pluggy: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel iniciar a conexao com o banco" });
    }
  });

  // o front manda o itemId que o widget devolveu; lemos item + contas e gravamos a conexao
  app.post("/connect", async (request, reply) => {
    if (!pluggyConfigured()) return notConfigured(reply);
    const parsed = connectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const userId = request.user.sub;
    const now = new Date();
    const { itemId } = parsed.data;

    let status: string;
    let institutionId: string | null;
    let institutionName: string | null;
    let lastError: string | null;
    let balance: number;
    try {
      const item = await getItem(itemId);
      balance = await getBankBalance(itemId);
      status = item.status;
      institutionId = item.connector?.id != null ? String(item.connector.id) : null;
      institutionName = item.connector?.name ?? null;
      lastError = item.error?.message ?? null;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao ler item/contas do Pluggy: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel ler os dados do banco" });
    }

    // upsert: 1 banco por usuario. reconectar troca o item e zera o erro.
    const data = {
      pluggyItemId: itemId,
      institutionId,
      institutionName,
      status,
      currentBalance: balance,
      currentBalanceAt: now,
      lastSyncedAt: now,
      lastError,
    };
    const connection = await prisma.bankConnection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    // ancora de inicio do mes (se ainda nao existe). usa o saldo recem-lido.
    await prisma.bankBalanceSnapshot.upsert({
      where: { userId_month: { userId, month: currentMonthKey(now) } },
      create: {
        userId,
        connectionId: connection.id,
        month: currentMonthKey(now),
        openingBalance: balance,
        partial: now.getUTCDate() > 1,
      },
      update: {},
    });

    return reply.code(201).send(await buildState(userId, now, request.log));
  });

  // sincronizar agora: forca o Pluggy a puxar do banco (caro), espera assentar e rele o saldo
  app.post("/sync", async (request, reply) => {
    if (!pluggyConfigured()) return notConfigured(reply);
    const userId = request.user.sub;
    const now = new Date();
    const connection = await prisma.bankConnection.findUnique({ where: { userId } });
    if (!connection) return reply.code(404).send({ error: "Nenhum banco conectado" });

    try {
      await triggerUpdate(connection.pluggyItemId);
      const item = await pollUntilSettled(connection.pluggyItemId);
      const balance = await getBankBalance(connection.pluggyItemId);
      await prisma.bankConnection.update({
        where: { userId },
        data: {
          status: item.status,
          currentBalance: balance,
          currentBalanceAt: now,
          lastSyncedAt: now,
          lastError: item.error?.message ?? null,
        },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, `falha ao sincronizar com o Pluggy: ${detail}`);
      return reply.code(502).send({ error: "Nao foi possivel sincronizar com o banco agora" });
    }

    return reply.send(await buildState(userId, now, request.log));
  });

  // desconectar: apaga o item no Pluggy (best-effort) e remove a conexao local (cascade nos
  // snapshots). deleteMany escopado por userId evita IDOR.
  app.delete("/connection", async (request, reply) => {
    const userId = request.user.sub;
    const connection = await prisma.bankConnection.findUnique({ where: { userId } });
    if (!connection) return reply.code(404).send({ error: "Nenhum banco conectado" });

    if (pluggyConfigured()) {
      try {
        await deleteItem(connection.pluggyItemId);
      } catch (err) {
        request.log.warn({ err }, "falha ao apagar item no Pluggy (removendo local mesmo assim)");
      }
    }
    await prisma.bankConnection.deleteMany({ where: { userId } });
    return reply.code(204).send();
  });
}
