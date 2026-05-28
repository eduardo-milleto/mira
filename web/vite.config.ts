import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // garante uma unica instancia de React (evita "Invalid hook call" com recharts no dev)
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "recharts"],
  },
  server: {
    port: 5173,
  },
});
