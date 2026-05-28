import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type AuthResponse = { user: User };

export const sessionKey = ["session"] as const;

// query da sessao reaproveitada no React e no beforeLoad das rotas.
// 401 vira null (sem sessao) em vez de erro.
export const sessionQueryOptions = {
  queryKey: sessionKey,
  queryFn: async (): Promise<User | null> => {
    try {
      const { user } = await api.get<AuthResponse>("/auth/me");
      return user;
    } catch (err) {
      // qualquer falha na checagem de sessao (401, rede, API fora) = nao logado.
      // assim a app degrada pro /login em vez de quebrar a tela toda.
      if (!(err instanceof ApiError && err.status === 401)) {
        console.warn("checagem de sessao falhou, tratando como deslogado:", err);
      }
      return null;
    }
  },
};

// busca o usuario logado
export function useSession() {
  return useQuery(sessionQueryOptions);
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; remember: boolean }) =>
      api.post<AuthResponse>("/auth/login", input),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      api.post<AuthResponse>("/auth/register", input),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("/auth/logout"),
    onSuccess: () => qc.setQueryData(sessionKey, null),
  });
}
