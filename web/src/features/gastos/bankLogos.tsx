// logos dos bancos exibidos no icone do cartao. comecamos pelo Inter e a ideia
// e ir adicionando os demais aqui. cada logo preenche o box do icone; bancos sem
// logo caem no icone generico de cartao la no CardsTab.
import type { JSX } from "react";
import interLogo from "../../assets/banks/inter.png";
import itauLogo from "../../assets/banks/itau.png";
import banrisulLogo from "../../assets/banks/banrisul.png";
import nubankLogo from "../../assets/banks/nubank.png";
import bradescoLogo from "../../assets/banks/bradesco.png";
import mercadoPagoLogo from "../../assets/banks/mercado-pago.png";
import amexLogo from "../../assets/banks/amex.png";
import eloLogo from "../../assets/banks/elo.png";
import hipercardLogo from "../../assets/banks/hipercard.png";
import santanderLogo from "../../assets/banks/santander.png";
import bancoDoBrasilLogo from "../../assets/banks/banco-do-brasil.png";

type BankLogoProps = { className?: string };
type BankLogo = (props: BankLogoProps) => JSX.Element;

// art = render do cartao; fit = como encaixa no quadrado. quase todo cartao e
// horizontal e fica melhor com "cover"; os verticais (ex: Mercado Pago) usam
// "contain" pra nao perder a identidade no corte.
function makeLogo(art: string, alt: string, fit: "cover" | "contain" = "cover"): BankLogo {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  return function Logo({ className }: BankLogoProps) {
    return <img src={art} alt={alt} className={`${className ?? ""} ${fitClass}`} />;
  };
}

// chave normalizada (minuscula, sem espacos nas pontas) -> logo do banco.
// inclui variacoes com/sem acento pois o banco vem de texto livre.
const itau = makeLogo(itauLogo, "Itau");
const nubank = makeLogo(nubankLogo, "Nubank");
const BANK_LOGOS: Record<string, BankLogo> = {
  inter: makeLogo(interLogo, "Inter"),
  itau,
  "itaú": itau,
  banrisul: makeLogo(banrisulLogo, "Banrisul"),
  nubank,
  nu: nubank,
  bradesco: makeLogo(bradescoLogo, "Bradesco"),
  "mercado pago": makeLogo(mercadoPagoLogo, "Mercado Pago", "contain"),
  santander: makeLogo(santanderLogo, "Santander", "contain"),
  "banco do brasil": makeLogo(bancoDoBrasilLogo, "Banco do Brasil"),
  bb: makeLogo(bancoDoBrasilLogo, "Banco do Brasil"),
};

// logos de bandeira (campo brand): so usados quando o banco nao tem logo proprio.
// Amex e bandeira, entao so aparece pro cartao American Express de fato.
const amex = makeLogo(amexLogo, "American Express");
const BRAND_LOGOS: Record<string, BankLogo> = {
  "american express": amex,
  amex,
  elo: makeLogo(eloLogo, "Elo"),
  hipercard: makeLogo(hipercardLogo, "Hipercard"),
};

function lookup(value: string | null | undefined, map: Record<string, BankLogo>): BankLogo | null {
  if (!value) return null;
  return map[value.trim().toLowerCase()] ?? null;
}

// o banco manda; so cai pra bandeira quando o banco nao tem logo registrado.
export function getBankLogo(
  bank: string | null | undefined,
  brand?: string | null,
): BankLogo | null {
  return lookup(bank, BANK_LOGOS) ?? lookup(brand, BRAND_LOGOS);
}
