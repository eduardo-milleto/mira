type LogoProps = {
  /** mostra o simbolo + a palavra "mira" (full) ou so o simbolo (mark) */
  variant?: "full" | "mark";
  className?: string;
};

// recriacao em SVG do logo do Mira (simbolo verde em gradiente + wordmark).
// pra trocar pelo asset oficial, basta dropar em web/public e usar <img>.
export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8"
        role="img"
        aria-label="Mira"
      >
        <defs>
          <linearGradient id="mira-grad" x1="0" y1="40" x2="40" y2="0">
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path
          d="M6 32 L17 11 L24 11 L13 32 Z"
          fill="url(#mira-grad)"
          stroke="url(#mira-grad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 32 L29 17 L36 32 Z"
          fill="url(#mira-grad)"
          stroke="url(#mira-grad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      {variant === "full" && (
        <span className="text-2xl font-light tracking-tighter text-heading">mira</span>
      )}
    </span>
  );
}
