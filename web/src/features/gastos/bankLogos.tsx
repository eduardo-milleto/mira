// logos dos bancos exibidos no icone do cartao. comecamos pelo Inter e a ideia
// e ir adicionando os demais aqui. cada logo preenche o box do icone; bancos sem
// logo caem no icone generico de cartao la no CardsTab.
import type { JSX } from "react";
import interLogo from "../../assets/banks/inter.png";
import itauLogo from "../../assets/banks/itau.png";

type BankLogoProps = { className?: string };
type BankLogo = (props: BankLogoProps) => JSX.Element;

function InterLogo({ className }: BankLogoProps) {
  return <img src={interLogo} alt="Inter" className={className} />;
}

function ItauLogo({ className }: BankLogoProps) {
  return <img src={itauLogo} alt="Itau" className={className} />;
}

// chave normalizada (minuscula, sem espacos nas pontas) -> logo do banco.
// inclui variacoes com/sem acento pois o banco vem de texto livre.
const BANK_LOGOS: Record<string, BankLogo> = {
  inter: InterLogo,
  itau: ItauLogo,
  "itaú": ItauLogo,
};

export function getBankLogo(bank: string | null | undefined): BankLogo | null {
  if (!bank) return null;
  return BANK_LOGOS[bank.trim().toLowerCase()] ?? null;
}
