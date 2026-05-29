import { timingSafeEqual } from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "./lib/cookies.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { insightsRoutes } from "./modules/insights/insights.routes.js";

// rotas que estabelecem sessao nao tem token CSRF ainda, entao ficam de fora da checagem
const CSRF_EXEMPT = new Set(["/auth/login", "/auth/register"]);
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie);
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });

  // CSRF double-submit: o header precisa bater com o cookie legivel pelo JS
  app.addHook("preHandler", async (request, reply) => {
    if (!MUTATING.has(request.method)) return;
    const path = request.url.split("?")[0];
    if (CSRF_EXEMPT.has(path)) return;

    const header = request.headers["x-csrf-token"];
    const cookieToken = request.cookies[CSRF_COOKIE];
    const headerToken = Array.isArray(header) ? header[0] : header;

    if (!cookieToken || !headerToken || !tokensMatch(headerToken, cookieToken)) {
      return reply.code(403).send({ error: "CSRF token invalido" });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(insightsRoutes, { prefix: "/insights" });

  return app;
}

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
