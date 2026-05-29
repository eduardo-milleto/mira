import type { CookieSerializeOptions } from "@fastify/cookie";
import { isProd } from "../env.js";

export const SESSION_COOKIE = "mira_session";

// em dev front e api rodam em localhost (mesmo site, portas diferentes) -> lax/sem secure.
// em prod sao sites diferentes (vercel x railway) -> none + secure + partitioned (CHIPS),
// que e o que faz o Safari/Chrome aceitarem o cookie cross-site sem precisar de subdominio.
const sameSite: "lax" | "none" = isProd ? "none" : "lax";

const DAY = 60 * 60 * 24;

// cookie da sessao: httpOnly pra o JS nunca ler o token
export function sessionCookieOptions(remember: boolean): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    partitioned: isProd,
    path: "/",
    // "lembrar de mim" = 30 dias; senao cookie de sessao (expira ao fechar o navegador)
    maxAge: remember ? DAY * 30 : undefined,
  };
}

export function clearCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    partitioned: isProd,
    path: "/",
  };
}
