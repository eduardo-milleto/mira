import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { cn } from "../../lib/cn";
import { formatBRL } from "../../lib/format";
import { monthLabel } from "../../lib/month";
import type { BankConnected } from "./saldo-banco.api";

// projecao "inicio -> fim do mes": ancora no saldo de inicio do mes, soma a sobra prevista
// (mesmo calculo do Cofre) e mostra onde o saldo de hoje cai nessa trajetoria.
export function BalanceProjectionCard({ state }: { state: BankConnected }) {
  const { openingBalance, currentBalance, projectedEndBalance, monthSurplus, partialOpening, month } =
    state;
  const positive = monthSurplus >= 0;

  // posicao do saldo de hoje entre inicio e fim (0..1). span ~0 => trata como cheio.
  const span = projectedEndBalance - openingBalance;
  const raw = Math.abs(span) < 0.005 ? 1 : (currentBalance - openingBalance) / span;
  const fraction = Math.min(1, Math.max(0, raw));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          Projecao do mes <Info className="h-3.5 w-3.5 text-faint" />
        </p>
        <span className="text-xs text-faint">{monthLabel(month)}</span>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div>
          <p className="text-xs text-faint">Fim do mes previsto</p>
          <p className="tnum mt-1 text-4xl font-light tracking-tighter text-heading">
            {formatBRL(projectedEndBalance)}
          </p>
        </div>
        <span
          className={cn(
            "tnum mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            positive ? "bg-brand-soft text-brand" : "bg-negative/10 text-negative",
          )}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : "−"}
          {formatBRL(Math.abs(monthSurplus))}
        </span>
      </div>

      {/* trajetoria: inicio (esquerda) -> fim (direita), com o saldo de hoje marcado */}
      <div className="mt-6">
        <div className="relative h-2 rounded-full bg-white/5">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full", positive ? "bg-brand" : "bg-negative")}
            style={{ width: `${fraction * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-heading"
            style={{ left: `${fraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-faint">
            {partialOpening ? "Desde a conexao" : "Inicio do mes"}
          </span>
          <span className="text-faint">Fim do mes</span>
        </div>
        <div className="tnum flex items-center justify-between text-sm">
          <span className="text-muted">{formatBRL(openingBalance)}</span>
          <span className="text-muted">{formatBRL(projectedEndBalance)}</span>
        </div>
      </div>

      <p className="mt-5 text-xs font-light leading-relaxed text-faint">
        Saldo de hoje: <span className="tnum text-muted">{formatBRL(currentBalance)}</span>. A
        projecao soma a sobra prevista do mes (seus ganhos menos gastos) ao saldo de inicio do mes.
        {partialOpening
          ? " Como a conexao foi feita no meio do mes, o inicio e estimado a partir da conexao."
          : ""}
      </p>
    </Card>
  );
}
