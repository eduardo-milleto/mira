import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

// estado da aba. sem conexao: { connected: false }. com conexao, traz saldo de hoje (do
// banco), ancora de inicio do mes, sobra prevista (mesmo calculo do Cofre) e projecao de fim.
export type BankConnected = {
  connected: true;
  institutionName: string | null;
  status: string; // UPDATED | LOGIN_ERROR | WAITING_USER_INPUT | UPDATING | ...
  lastError: string | null;
  currentBalance: number; // saldo de hoje (soma das contas BANK)
  currentBalanceAt: string | null;
  lastSyncedAt: string | null;
  month: string; // "YYYY-MM"
  openingBalance: number; // saldo no inicio do mes (ou na conexao, se partial)
  partialOpening: boolean; // true = ancora capturada no meio do mes
  monthSurplus: number; // sobra prevista do mes (pode ser negativa)
  projectedEndBalance: number; // openingBalance + monthSurplus
};

export type BankState = { connected: false } | BankConnected;

export const bankKey = ["bank-balance"] as const;

// estado completo (faz o backend reler saldo/status do Pluggy, leitura barata)
export function useBankState(enabled = true) {
  return useQuery({
    queryKey: bankKey,
    queryFn: () => api.get<BankState>("/saldo-banco"),
    enabled,
  });
}

// gera o token de curta duracao pro widget do Pluggy abrir
export function useConnectToken() {
  return useMutation({
    mutationFn: () => api.post<{ connectToken: string }>("/saldo-banco/connect-token"),
  });
}

// envia o itemId que o widget devolveu; backend grava a conexao e devolve o estado novo
export function useConnectBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.post<BankState>("/saldo-banco/connect", { itemId }),
    onSuccess: (data) => qc.setQueryData(bankKey, data),
  });
}

// forca o Pluggy a puxar do banco agora; devolve o estado atualizado
export function useSyncBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BankState>("/saldo-banco/sync"),
    onSuccess: (data) => qc.setQueryData(bankKey, data),
  });
}

// desconecta o banco (apaga item no Pluggy + conexao local)
export function useDisconnectBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<null>("/saldo-banco/connection"),
    onSuccess: () => qc.setQueryData(bankKey, { connected: false }),
  });
}
