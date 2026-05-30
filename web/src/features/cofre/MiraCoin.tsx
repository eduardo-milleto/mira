import { useId } from "react";
import { cn } from "../../lib/cn";

type MiraCoinProps = {
  size?: "lg" | "sm"; // lg = moeda-heroi do card; sm = pill do header
  className?: string;
};

// dimensoes + glow por tamanho (a moeda e desenhada em coordenadas 0..100, escala sozinha)
const sizeClass: Record<NonNullable<MiraCoinProps["size"]>, string> = {
  lg: "h-20 w-20 shadow-glow",
  sm: "h-7 w-7",
};

// Moeda Mira em estilo desenho: fundo preto com contorno e marca em verde (vazada).
// Flat/line-art, sem metal. Respeita o tema preto/branco + verde semantico.
// Id de gradiente unico por instancia (useId) pra nao colidir com outra moeda na tela.
export function MiraCoin({ size = "lg", className }: MiraCoinProps) {
  const uid = useId();
  const greenId = `coin-green-${uid}`;

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 rounded-full", sizeClass[size], className)}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          {/* verde do Mira (mesmo do logo) */}
          <linearGradient id={greenId} x1="0" y1="100" x2="100" y2="0">
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* disco preto com borda verde (vazado) */}
        <circle cx="50" cy="50" r="46" fill="#0a0b0a" stroke={`url(#${greenId})`} strokeWidth="4" />
        {/* anel interno fino: detalhe de moeda cunhada, so linha */}
        <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#${greenId})`} strokeWidth="1.5" opacity="0.4" />

        {/* marca do Mira no centro (bbox local ~ x6..36, y11..32, escalada 1.5x) */}
        <g transform="translate(18.5 17.75) scale(1.5)">
          <path
            d="M6 32 L17 11 L24 11 L13 32 Z"
            fill={`url(#${greenId})`}
            stroke={`url(#${greenId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M22 32 L29 17 L36 32 Z"
            fill={`url(#${greenId})`}
            stroke={`url(#${greenId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  );
}
