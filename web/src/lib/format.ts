const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 0,
});

// "R$ 4.389,60"
export function formatBRL(value: number): string {
  return brl.format(value);
}

// "R$ 6 mil" -> usado nos eixos dos graficos
export function formatBRLCompact(value: number): string {
  return brlCompact.format(value);
}
