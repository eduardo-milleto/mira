import { formatBRL } from "../../lib/format";

// 1 moeda Mira = R$ 1. O backend manda `balance` em reais (Decimal 2 casas, ja com round2),
// e pode ser negativo (cofre estourado). Aqui derivamos tudo que a UI precisa de uma vez so,
// pra card e header concordarem sempre (fonte unica da verdade).
export type CoinBalance = {
  sign: -1 | 0 | 1; // direcao do saldo
  isNegative: boolean; // atalho pro estado "devendo"
  wholeCoins: number; // parte inteira em moedas, sempre >= 0 (sobre o valor absoluto)
  exactReais: number; // valor exato com centavos, preservando o sinal real
  coinsLabel: string; // "150 moedas" | "1 moeda" | "0 moedas"
  reaisLabel: string; // "R$ 150,50" (valor absoluto formatado)
};

// Converte o saldo do cofre (reais) em moedas Mira pra exibicao.
export function toCoinBalance(balance: number): CoinBalance {
  // normaliza -0, NaN e Infinity pra 0; valor valido passa direto (inclusive negativo)
  const reais = Number.isFinite(balance) && !Object.is(balance, -0) ? balance : 0;
  const sign: -1 | 0 | 1 = reais > 0 ? 1 : reais < 0 ? -1 : 0;
  // trunca pra baixo (150,99 -> 150 moedas): honesto, nunca arredonda pra cima
  const wholeCoins = Math.floor(Math.abs(reais));

  return {
    sign,
    isNegative: sign < 0,
    wholeCoins,
    exactReais: reais,
    reaisLabel: formatBRL(Math.abs(reais)),
    coinsLabel: `${wholeCoins.toLocaleString("pt-BR")} ${wholeCoins === 1 ? "moeda" : "moedas"}`,
  };
}
