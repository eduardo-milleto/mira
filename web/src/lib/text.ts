// Title Case: caps em cada palavra, inclusive preposicoes (ex: "Otimizacao De Investimentos").
// preserva siglas/acronimos ja em caixa alta ("IA" continua "IA").
export function titleCase(text?: string): string {
  if (!text) return "";
  return text
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
