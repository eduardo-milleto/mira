import { Link } from "@tanstack/react-router";
import { MiraCoin } from "./MiraCoin";
import { useCountUp } from "./useCountUp";
import { toCoinBalance } from "./coins";

// Indicador do saldo do cofre no header, sempre visivel. Clicar leva pro /cofre.
export function HeaderCoinPill({ balance }: { balance: number }) {
  const coins = toCoinBalance(balance);
  // moedas gastaveis: saldo negativo nao vira moeda (mostra 0, nao o floor do absoluto)
  const spendable = coins.isNegative ? 0 : coins.wholeCoins;
  const display = useCountUp(spendable);

  // saldo negativo conta a verdade pro leitor de tela; o resto mostra moedas + valor exato
  const label = coins.isNegative
    ? `Cofre: devendo ${coins.reaisLabel}`
    : `Cofre: ${spendable.toLocaleString("pt-BR")} ${spendable === 1 ? "moeda" : "moedas"} Mira (${coins.reaisLabel})`;

  return (
    <Link
      to="/cofre"
      aria-label={label}
      className="flex items-center gap-2 rounded-full border border-border py-1 pl-1.5 pr-3 text-sm text-muted outline-none transition hover:border-brand/40 hover:text-heading focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <MiraCoin size="sm" />
      <span aria-hidden="true" className="tnum font-light">
        {display.toLocaleString("pt-BR")}
      </span>
    </Link>
  );
}
