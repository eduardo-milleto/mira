import type { CookieSerializeOptions } from "@fastify/cookie";
import { env, isProd } from "../env.js";

export const SESSION_COOKIE = "mira_session";
export const CSRF_COOKIE = "mira_csrf";

// em dev front e api rodam ambos em localhost (mesmo site, portas diferentes) -> lax/sem secure
// em prod ficam em subdominios do mesmo site (mirafinance.app x api.mirafinance.app) -> none + secure
const sameSite: "lax" | "none" = isProd ? "none" : "lax";

// dominio compartilhado entre front e api em prod (ex: ".mirafinance.app"); em dev fica host-only
const domain = env.COOKIE_DOMAIN;

const DAY = 60 * 60 * 24;

// cookie da sessao: httpOnly pra o JS nunca ler o token
export function sessionCookieOptions(remember: boolean): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    domain,
    path: "/",
    // "lembrar de mim" = 30 dias; senao cookie de sessao (expira ao fechar o navegador)
    maxAge: remember ? DAY * 30 : undefined,
  };
}

// cookie do token CSRF: precisa ser legivel pelo JS pra o front ecoar no header
export function csrfCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: false,
    secure: isProd,
    sameSite,
    domain,
    path: "/",
    maxAge: DAY * 30,
  };
}

export function clearCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    domain,
    path: "/",
  };
}
