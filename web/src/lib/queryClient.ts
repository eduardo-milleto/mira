import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
      // precisa ser >= maxAge do persister pra entrada salva no localStorage nao
      // ser coletada da memoria antes de reidratar no reload
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

// persiste o cache do React Query no localStorage: no reload a analise (e o resto)
// reaparece na hora, sem recalcular. limpamos no logout pra nao vazar entre usuarios.
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "mira-query-cache",
});
