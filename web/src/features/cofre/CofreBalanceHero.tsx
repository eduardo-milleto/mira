import { Card } from "../../components/ui/Card";
import { MiraCoin } from "./MiraCoin";
import { useCountUp } from "./useCountUp";
import { toCoinBalance } from "./coins";

type Props = { balance: number; isLoading?: boolean };

// Hero do saldo do cofre em moedas Mira (1 moeda = R$ 1). Numero grande = moedas inteiras,
// sub-rotulo = valor exato em reais (honesto, com centavos). Tres estados: carregando,
// devendo (saldo negativo) e normal.
export function CofreBalanceHero({ balance, isLoading }: Props) {
  const coins = toCoinBalance(balance);
  // anima sempre as moedas inteiras (>= 0); o sinal e tratado visualmente
  const display = useCountUp(coins.wholeCoins);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-5 p-6">
        <span className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-white/5" />
        <div className="flex flex-col gap-2">
          <span className="h-4 w-24 animate-pulse rounded bg-white/5" />
          <span className="h-10 w-44 animate-pulse rounded-lg bg-white/5" />
        </div>
      </Card>
    );
  }

  // saldo negativo: nao existe moeda negativa -> moeda apagada + valor devido em vermelho
  if (coins.isNegative) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">Saldo do cofre</p>
        <div className="mt-2 flex items-center gap-5">
          <MiraCoin size="lg" className="opacity-40 grayscale" />
          <div className="min-w-0">
            <p className="tnum text-4xl font-light tracking-tighter text-negative">
              Devendo {coins.reaisLabel}
            </p>
            <p className="mt-1 text-sm text-faint">0 moedas Mira disponíveis</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-negative">Você gastou além do que tinha guardado.</p>
      </Card>
    );
  }

  return (
    <Card
      role="group"
      aria-label={`Saldo do cofre: ${coins.coinsLabel} Mira, equivalente a ${coins.reaisLabel}`}
      className="flex items-center gap-5 p-6"
    >
      <MiraCoin size="lg" />
      <div className="min-w-0">
        <p className="text-sm text-muted">Saldo do cofre</p>
        {/* numero animado: escondido do leitor de tela (o aria-label do grupo ja diz o valor real) */}
        <p
          aria-hidden="true"
          className="tnum mt-1 flex items-baseline gap-2 text-5xl font-light tracking-tightest text-heading"
        >
          {display.toLocaleString("pt-BR")}
          <span className="text-xl font-light tracking-tighter text-muted">
            {coins.wholeCoins === 1 ? "moeda" : "moedas"}
          </span>
        </p>
        <p aria-hidden="true" className="tnum mt-1 text-sm text-faint">
          {coins.reaisLabel}
        </p>
      </div>
    </Card>
  );
}
