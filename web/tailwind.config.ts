import type { Config } from "tailwindcss";

// tokens do Mira: dark + verde. herda a disciplina tipografica da Stripe
// (peso leve, tracking apertado, numerais tabulares) sobre tema preto.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0a0b0a",
        surface: "#111312",
        "surface-2": "#161917",
        border: "rgba(255,255,255,0.10)",
        heading: "#fafafa",
        muted: "rgba(255,255,255,0.60)",
        faint: "rgba(255,255,255,0.40)",
        brand: {
          DEFAULT: "#22c55e",
          dark: "#16a34a",
          soft: "rgba(34,197,94,0.12)",
        },
        positive: "#22c55e",
        negative: "#f87171",
      },
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        // profundidade em camadas no espirito da Stripe, tingida de verde no tema dark
        card: "0 30px 45px -30px rgba(0,0,0,0.6), 0 18px 36px -18px rgba(0,0,0,0.4)",
        glow: "0 0 80px -20px rgba(34,197,94,0.45)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      },
      keyframes: {
        // brilho que varre a moeda Mira uma vez
        "coin-shine": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        // registrado aqui (e nao em CSS) pra variante motion-safe: funcionar
        "coin-shine": "coin-shine 1.1s ease-out 0.15s 1 both",
      },
    },
  },
  plugins: [],
} satisfies Config;
