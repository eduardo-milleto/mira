import type { FastifyInstance, FastifyReply } from "fastify";
import type { User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { SESSION_COOKIE, clearCookieOptions, sessionCookieOptions } from "../../lib/cookies.js";
import { authenticate } from "../../plugins/auth.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

// tira o hash da senha antes de devolver o usuario pro cliente
function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

// assina o JWT e seta o cookie de sessao (CSRF e por validacao de Origin no server.ts)
function startSession(reply: FastifyReply, user: User, remember: boolean) {
  const token = reply.server.jwt.sign({ sub: user.id }, { expiresIn: remember ? "30d" : "1d" });
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(remember));
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const { name, email, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(409).send({ error: "Esse email ja esta cadastrado" });
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });

    startSession(reply, user, false);
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados invalidos" });
    }
    const { email, password, remember } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // verifica a senha mesmo sem usuario pra nao vazar timing (qual email existe)
    const ok = user ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: "Email ou senha incorretos" });
    }

    startSession(reply, user, remember);
    return reply.send({ user: publicUser(user) });
  });

  app.post("/logout", { preHandler: authenticate }, async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
      return reply.code(401).send({ error: "Sessao invalida" });
    }
    return reply.send({ user: publicUser(user) });
  });
}
