import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { SESSION_COOKIE } from "./lib/cookies.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { insightsRoutes } from "./modules/insights/insights.routes.js";
import { gastosRoutes } from "./modules/gastos/gastos.routes.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie);
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });

  // CSRF por validacao de Origin: requests mutantes precisam vir da origem confiavel.
  // o navegador seta o header Origin e nao deixa o JS forja-lo, entao isso barra CSRF
  // cross-site sem depender de cookie legivel pelo front (que nao funciona cross-domain).
  app.addHook("preHandler", async (request, reply) => {
    if (!MUTATING.has(request.method)) return;
    if (request.headers.origin !== env.CORS_ORIGIN) {
      return reply.code(403).send({ error: "Origem nao permitida" });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(insightsRoutes, { prefix: "/insights" });
  await app.register(gastosRoutes, { prefix: "/gastos" });

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
