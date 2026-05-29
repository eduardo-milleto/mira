import { useId } from "react";
import { cn } from "../../lib/cn";

type MiraCoinProps = {
  size?: "lg" | "sm"; // lg = moeda-heroi do card; sm = pill do header
  className?: string;
};

// dimensoes + glow por tamanho (a moeda em si e desenhada em coordenadas 0..100, escala sozinha)
const sizeClass: Record<NonNullable<MiraCoinProps["size"]>, string> = {
  lg: "h-20 w-20 shadow-glow",
  sm: "h-7 w-7",
};

// Moeda Mira: disco metalico monocromatico (sem dourado, respeitando o tema preto/branco)
// com a marca verde do Mira cunhada no centro. SVG autocontido pra controlar a proporcao;
// os ids de gradiente sao unicos por instancia (useId) pra nao colidir quando ha mais de
// uma moeda na tela (ex: heroi do cofre + pill do header).
export function MiraCoin({ size = "lg", className }: MiraCoinProps) {
  const uid = useId();
  const faceId = `coin-face-${uid}`;
  const markId = `coin-mark-${uid}`;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        sizeClass[size],
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          {/* metal: brilho no topo-esquerda, borda escura -> aparencia de disco cunhado */}
          <radialGradient id={faceId} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#eceeed" />
            <stop offset="45%" stopColor="#a9adab" />
            <stop offset="100%" stopColor="#262927" />
          </radialGradient>
          {/* marca: mesmo verde do logo (Logo.tsx) */}
          <linearGradient id={markId} x1="0" y1="40" x2="40" y2="0">
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="50" fill={`url(#${faceId})`} />
        {/* rim cunhado na borda */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />

        {/* marca do Mira centralizada (bbox local ~ x6..36, y11..32, escalada 1.5x) */}
        <g transform="translate(18.5 17.75) scale(1.5)">
          <path
            d="M6 32 L17 11 L24 11 L13 32 Z"
            fill={`url(#${markId})`}
            stroke={`url(#${markId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M22 32 L29 17 L36 32 Z"
            fill={`url(#${markId})`}
            stroke={`url(#${markId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {/* brilho que varre a moeda uma vez ao montar (so no tamanho grande; off em motion-reduce) */}
      {size === "lg" && (
        <span className="motion-safe:animate-coin-shine pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}
    </span>
  );
}
