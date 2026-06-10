import { useEffect, useMemo, useState } from "react";
import { Dialog, Heading, Label, Modal as AriaModal, ModalOverlay } from "react-aria-components";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Checkbox";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { cn } from "../../lib/cn";
import { formatBRL } from "../../lib/format";
import { monthLabel } from "../../lib/month";
import { useInvestments } from "../investimentos/investimentos.api";
import { useConfirmMonthClose, type PendingMonth } from "./cofre.api";

// estado de confirmacao de cada mes: confirmar (descontando os aportes marcados) ou corrigir
// o valor na mao (com motivo). checkedIds = aportes que o usuario marcou como feitos no mes.
type Entry = { mode: "confirm" | "adjust"; amount: number; reason: string; checkedIds: string[] };

const segBase = "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs outline-none transition";
const segActive = "bg-surface-2 text-heading shadow-card";
const segIdle = "text-muted hover:text-heading";

// modal BLOQUEANTE: nao dismissivel e sem botao de fechar — o usuario so sai confirmando os
// fechamentos pendentes. fica "na cara" dele no login enquanto houver mes sem confirmar.
export function CofreMonthCloseModal({ pendingMonths }: { pendingMonths: PendingMonth[] }) {
  const confirm = useConfirmMonthClose();
  const investmentsQuery = useInvestments();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // aportes mensais planejados (investimentos + bens). cada um marcado sai da sobra do mes.
  const aportes = useMemo(
    () =>
      (investmentsQuery.data ?? [])
        .filter((i) => (i.monthlyContribution ?? 0) > 0)
        .map((i) => ({ id: i.id, name: i.name, amount: i.monthlyContribution as number })),
    [investmentsQuery.data],
  );

  // inicializa cada mes pendente no modo "confirmar", sem nenhum aporte marcado ainda —
  // a sobra comeca no valor bruto e vai reduzindo conforme o usuario marca os aportes feitos
  useEffect(() => {
    setEntries((prev) => {
      const next: Record<string, Entry> = {};
      for (const p of pendingMonths) {
        next[p.month] =
          prev[p.month] ?? {
            mode: "confirm",
            amount: p.computedSurplus > 0 ? p.computedSurplus : 0,
            reason: "",
            checkedIds: [],
          };
      }
      return next;
    });
  }, [pendingMonths]);

  function setEntry(month: string, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [month]: { ...prev[month], ...patch } }));
  }

  function toggleAporte(month: string, id: string, selected: boolean) {
    setEntries((prev) => {
      const e = prev[month];
      const checkedIds = selected
        ? [...e.checkedIds, id]
        : e.checkedIds.filter((x) => x !== id);
      return { ...prev, [month]: { ...e, checkedIds } };
    });
  }

  // soma dos aportes marcados no mes
  function contributionsOf(e: Entry): number {
    return aportes
      .filter((a) => e.checkedIds.includes(a.id))
      .reduce((sum, a) => sum + a.amount, 0);
  }

  async function handleConfirmAll() {
    setError(null);
    // mes corrigido na mao exige motivo
    for (const p of pendingMonths) {
      const e = entries[p.month];
      if (e?.mode === "adjust" && e.reason.trim().length === 0) {
        setError(`Escreva o motivo da correção de ${monthLabel(p.month)}.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      // fecha do mais antigo pro mais novo (pendingMonths vem em ordem crescente do backend)
      for (const p of pendingMonths) {
        const e = entries[p.month];
        if (e.mode === "adjust") {
          // correcao manual: o usuario digita a sobra final; nao desconta aportes aqui
          await confirm.mutateAsync({
            month: p.month,
            confirmedSurplus: e.amount,
            contributionsApplied: 0,
            reason: e.reason.trim(),
          });
        } else {
          // sobra liquida = bruto - aportes marcados
          const contributions = contributionsOf(e);
          await confirm.mutateAsync({
            month: p.month,
            confirmedSurplus: p.computedSurplus - contributions,
            contributionsApplied: contributions,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível fechar o mês.");
    } finally {
      setSubmitting(false);
    }
  }

  const multiple = pendingMonths.length > 1;
  const aportesLoading = investmentsQuery.isLoading;

  return (
    <ModalOverlay
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <AriaModal className="w-full max-w-lg rounded-2xl border border-border bg-surface/95 shadow-card backdrop-blur outline-none">
        <Dialog className="outline-none">
          <div className="border-b border-border px-6 py-4">
            <Heading slot="title" className="text-lg font-medium text-heading">
              {multiple ? "Confirme o que sobrou nesses meses" : "Confirme o que sobrou no mês"}
            </Heading>
            <p className="mt-1 text-sm text-muted">
              {multiple
                ? "Você ficou um tempo fora. Confirme (ou corrija) a sobra de cada mês — ela vai pro seu cofre."
                : "Fechou o mês. Marque os aportes que você fez e confirme o que sobrou — esse valor vai pro seu cofre."}
            </p>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-4">
              {pendingMonths.map((p) => {
                const e = entries[p.month];
                if (!e) return null;
                const negative = p.computedSurplus < 0;
                const contributions = contributionsOf(e);
                const net = p.computedSurplus - contributions; // o que vai pro cofre no modo confirmar
                return (
                  <div key={p.month} className="rounded-xl border border-border bg-surface-2/50 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-heading">{monthLabel(p.month)}</span>
                      <span className={cn("tnum text-sm", negative ? "text-negative" : "text-heading")}>
                        {negative ? "−" : ""}
                        {formatBRL(Math.abs(p.computedSurplus))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-faint">
                      {negative
                        ? "Pelo app, você fechou no negativo (ganhos − gastos)."
                        : "Resultado bruto do mês (ganhos − gastos)."}
                    </p>

                    <div className="mt-3 flex gap-1 rounded-lg border border-border bg-surface/60 p-1">
                      <button
                        type="button"
                        onClick={() => setEntry(p.month, { mode: "confirm" })}
                        className={cn(segBase, e.mode === "confirm" ? segActive : segIdle)}
                      >
                        Está certo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntry(p.month, { mode: "adjust", amount: Math.max(0, net) })}
                        className={cn(segBase, e.mode === "adjust" ? segActive : segIdle)}
                      >
                        Foi outro valor
                      </button>
                    </div>

                    {e.mode === "confirm" ? (
                      <div className="mt-3 flex flex-col gap-3">
                        {aportesLoading ? (
                          <p className="text-xs text-faint">Carregando seus aportes...</p>
                        ) : aportes.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-muted">Aportes que você fez nesse mês</span>
                            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface/60 p-3">
                              {aportes.map((a) => (
                                <Checkbox
                                  key={a.id}
                                  isSelected={e.checkedIds.includes(a.id)}
                                  onChange={(sel) => toggleAporte(p.month, a.id, sel)}
                                  className="justify-between"
                                >
                                  <span className="flex flex-1 items-baseline justify-between gap-3">
                                    <span className="min-w-0 truncate text-heading">{a.name}</span>
                                    <span className="tnum shrink-0 text-muted">−{formatBRL(a.amount)}</span>
                                  </span>
                                </Checkbox>
                              ))}
                            </div>
                            <p className="text-xs text-faint">
                              Cada aporte marcado sai da sobra — esse dinheiro foi pro investimento, não pro cofre.
                            </p>
                          </div>
                        ) : null}

                        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                          <span className="text-sm text-heading">Vai Pro Cofre</span>
                          <span
                            className={cn("tnum text-sm", net < 0 ? "text-negative" : "text-heading")}
                          >
                            {net < 0 ? "−" : ""}
                            {formatBRL(Math.abs(net))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        <MoneyInput
                          label="Quanto sobrou de verdade"
                          value={e.amount}
                          onChange={(v) => setEntry(p.month, { amount: v })}
                        />
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm text-muted">Motivo da diferença</Label>
                          <textarea
                            value={e.reason}
                            onChange={(ev) => setEntry(p.month, { reason: ev.target.value })}
                            rows={2}
                            maxLength={300}
                            placeholder="Ex: tive um gasto que não registrei no app"
                            className={cn(
                              "w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
                              "placeholder:text-faint outline-none transition",
                              "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
                            )}
                          />
                          <p className="text-xs text-faint">
                            A Mira usa esse motivo pra entender gastos ou ganhos que passaram fora do app.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-4">
            {error && <p className="text-sm text-negative">{error}</p>}
            <Button
              onPress={handleConfirmAll}
              isPending={submitting}
              isDisabled={submitting || aportesLoading}
              className="w-full justify-center"
            >
              {submitting ? "Confirmando..." : multiple ? "Confirmar fechamentos" : "Confirmar fechamento"}
            </Button>
          </div>
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
