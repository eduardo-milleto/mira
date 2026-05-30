// logos dos bancos exibidos no icone do cartao. comecamos pelo Inter e a ideia
// e ir adicionando os demais aqui. cada logo renderiza um quadrado completo
// (com cor de marca propria) que preenche o box do icone; bancos sem logo caem
// no icone generico de cartao la no CardsTab.
import type { JSX } from "react";

type BankLogoProps = { className?: string };
type BankLogo = (props: BankLogoProps) => JSX.Element;

// raios do sunburst do Inter, em graus, girados em torno do ponto focal.
const INTER_RAY_ANGLES = [-72, -48, -24, 0, 24, 48, 72];

function InterLogo({ className }: BankLogoProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#FF7A00" />
      <g fill="#fff">
        {INTER_RAY_ANGLES.map((angle) => (
          <path
            key={angle}
            d="M20 4 L21.3 19 Q20 20.5 18.7 19 Z"
            transform={`rotate(${angle} 20 21)`}
          />
        ))}
      </g>
    </svg>
  );
}

// chave normalizada (minuscula, sem espacos nas pontas) -> logo do banco.
const BANK_LOGOS: Record<string, BankLogo> = {
  inter: InterLogo,
};

export function getBankLogo(bank: string | null | undefined): BankLogo | null {
  if (!bank) return null;
  return BANK_LOGOS[bank.trim().toLowerCase()] ?? null;
}
