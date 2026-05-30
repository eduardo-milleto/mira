import { env } from "../../env.js";
import { round2 } from "../../lib/surplus.js";

// cliente do Pluggy (Open Finance). a gente NUNCA ve as credenciais do banco do usuario:
// o widget do Pluggy autentica e devolve so um itemId. aqui falamos com a API do Pluggy
// usando nossas credenciais (client id/secret) pra ler item e contas daquele itemId.
// nada de secret/itemId/saldo nos logs.

const BASE_URL = "https://api.pluggy.ai";
// a apiKey do /auth dura ~2h; renovamos antes (110min) pra nunca usar uma expirada
const API_KEY_TTL_MS = 110 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;

export class PluggyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PluggyError";
    this.status = status;
  }
}

// conta do Pluggy. type "BANK" = conta corrente/poupanca (balance = saldo disponivel);
// type "CREDIT" = cartao (balance = fatura aberta devida, NAO entra no saldo do banco).
type PluggyAccount = {
  id: string;
  type: "BANK" | "CREDIT";
  subtype?: string | null;
  name?: string | null;
  balance: number;
  currencyCode?: string | null;
};

// item = a conexao com um banco. status diz se atualizou, deu erro de login, pede MFA, etc.
export type PluggyItem = {
  id: string;
  status: string;
  connector?: { id?: number; name?: string } | null;
  error?: { code?: string; message?: string } | null;
};

export function pluggyConfigured(): boolean {
  return Boolean(env.PLUGGY_CLIENT_ID && env.PLUGGY_CLIENT_SECRET);
}

let cachedApiKey: { key: string; expiresAt: number } | null = null;
let inflightAuth: Promise<string> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new PluggyError(504, `Pluggy timeout apos ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// troca client id/secret por uma apiKey de acesso total (cacheada em memoria)
async function authenticate(): Promise<string> {
  const res = await fetchWithTimeout(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: env.PLUGGY_CLIENT_ID,
      clientSecret: env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PluggyError(res.status, `Pluggy auth HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { apiKey?: string };
  if (!data.apiKey) throw new PluggyError(502, "Pluggy auth nao retornou apiKey");
  cachedApiKey = { key: data.apiKey, expiresAt: Date.now() + API_KEY_TTL_MS };
  return data.apiKey;
}

// apiKey valida do cache, ou uma nova. dedupe: se ja tem um /auth voando, espera ele
async function getApiKey(force = false): Promise<string> {
  if (!pluggyConfigured()) throw new PluggyError(503, "Pluggy nao configurado");
  if (!force && cachedApiKey && cachedApiKey.expiresAt > Date.now()) return cachedApiKey.key;
  if (!inflightAuth) {
    inflightAuth = authenticate().finally(() => {
      inflightAuth = null;
    });
  }
  return inflightAuth;
}

// chamada autenticada na API do Pluggy. em 401 (apiKey expirou) renova a chave e tenta 1x.
async function pluggyFetch<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "X-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (res.status === 401 && allowRetry) {
    await getApiKey(true);
    return pluggyFetch<T>(path, init, false);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PluggyError(res.status, `Pluggy HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// token de curta duracao (30min) pro widget do front. com itemId = modo update (reconexao)
export async function createConnectToken(itemId?: string): Promise<string> {
  const data = await pluggyFetch<{ accessToken?: string; connectToken?: string }>("/connect_token", {
    method: "POST",
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  const token = data.accessToken ?? data.connectToken;
  if (!token) throw new PluggyError(502, "Pluggy nao retornou connect token");
  return token;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(`/items/${encodeURIComponent(itemId)}`);
}

// saldo do banco = soma das contas BANK (conta/poupanca). CREDIT (fatura) fica de fora.
export async function getBankBalance(itemId: string): Promise<number> {
  const data = await pluggyFetch<{ results?: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
  );
  const bankAccounts = (data.results ?? []).filter((a) => a.type === "BANK");
  return round2(bankAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0));
}

// forca o Pluggy a buscar dados frescos no banco (sem redigitar senha). custa 1 atualizacao.
export async function triggerUpdate(itemId: string): Promise<void> {
  await pluggyFetch<PluggyItem>(`/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}

// estados terminais do item: parar de esperar quando chegar em algum deles (ou no timeout)
const SETTLED = new Set(["UPDATED", "LOGIN_ERROR", "WAITING_USER_INPUT", "OUTDATED", "ERROR"]);

// espera o item assentar apos um triggerUpdate. limite duro pra nunca travar a request.
export async function pollUntilSettled(itemId: string, maxMs = 30000, intervalMs = 2500): Promise<PluggyItem> {
  const deadline = Date.now() + maxMs;
  let item = await getItem(itemId);
  while (!SETTLED.has(item.status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    item = await getItem(itemId);
  }
  return item;
}

// apaga o item no Pluggy (ao desconectar). best-effort no caller.
export async function deleteItem(itemId: string): Promise<void> {
  await pluggyFetch<void>(`/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}
