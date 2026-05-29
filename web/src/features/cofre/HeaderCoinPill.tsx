import { Link } from "@tanstack/react-router";
import { MiraCoin } from "./MiraCoin";
import { useCountUp } from "./useCountUp";
import { toCoinBalance } from "./coins";

// Indicador compacto do saldo do cofre no header. Clicar leva pro /cofre.
// So aparece quando ha pelo menos 1 moeda inteira (header e enxuto: troco < R$1,
// saldo zero ou negativo nao viram pill).
export function HeaderCoinPill({ balance }: { balance: number }) {
  const coins = toCoinBalance(balance);
  const display = useCountUp(coins.wholeCoins);

  // wholeCoins usa o valor absoluto, entao saldo negativo tambem cai aqui (nao mostrar
  // "42" no header quando o cofre esta estourado) alem do troco < R$1 e do zero
  if (coins.isNegative || coins.wholeCoins < 1) return null;

  return (
    <Link
      to="/cofre"
      aria-label={`Cofre: ${coins.coinsLabel} Mira (${coins.reaisLabel})`}
      className="flex items-center gap-2 rounded-full border border-border py-1 pl-1.5 pr-3 text-sm text-muted outline-none transition hover:text-heading focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <MiraCoin size="sm" />
      <span aria-hidden="true" className="tnum font-light">
        {display.toLocaleString("pt-BR")}
      </span>
    </Link>
  );
}
