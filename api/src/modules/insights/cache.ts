import { createHash } from "node:crypto";
import type { InsightsRequest } from "./insights.schemas.js";

// serializacao estavel: ordena as chaves de cada objeto e ordena os arrays pelo
// proprio elemento ja serializado. assim o hash nao depende da ordem em que o
// cliente mandou os itens — breakdowns, fontes de renda e investimentos sao
// conjuntos (a ordem nao muda a analise), entao a mesma situacao gera sempre o
// mesmo hash. o valor so serve pra hashear; nunca e desserializado de volta.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).sort().join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]));
  return "{" + entries.join(",") + "}";
}

// hash do input + ano corrente. o ano entra porque a projecao depende dele: quando
// vira o ano, o hash muda e a analise recalcula uma vez. mesmo input no mesmo ano
// => mesmo hash => serve a analise salva sem rechamar o Gemini.
export function hashInput(input: InsightsRequest, currentYear: number): string {
  return createHash("sha256")
    .update(stableStringify(input) + "|" + currentYear)
    .digest("hex");
}
