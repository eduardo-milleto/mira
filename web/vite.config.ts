import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // garante uma unica instancia de React (evita "Invalid hook call" com recharts no dev)
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // pre-bundla tudo que usa React junto com a instancia dedupada, senao o cache
    // antigo do Vite pode trazer uma 2a copia de React ("Invalid hook call")
    include: [
      "react",
      "react-dom",
      "recharts",
      "@tanstack/react-query",
      "@tanstack/react-query-persist-client",
      "@tanstack/query-sync-storage-persister",
    ],
  },
  server: {
    port: 5173,
  },
});
