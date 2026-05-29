import { useState } from "react";
import { ExtrasList } from "./components/ExtrasList";
import type { ExtraKind } from "./extras.api";

const toggleBase =
  "cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40";
const toggleInactive = "text-muted hover:text-heading";
const toggleSelected = "bg-surface-2 text-heading shadow-card";

export function ExtrasPage() {
  // view ativa do toggle: ganhos extras ou gastos extras
  const [kind, setKind] = useState<ExtraKind>("ganho");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Extras</h1>
        <p className="mt-1 text-sm text-muted">
          Lance ganhos e gastos pontuais de um mês — eles ajustam o total daquele mês na sua visão geral.
        </p>
      </div>

      {/* toggle entre as duas views (sem select nativo, seguindo o padrao de abas) */}
      <div
        role="tablist"
        aria-label="Tipo de lançamento"
        className="inline-flex gap-1 self-start rounded-xl border border-border bg-surface/60 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={kind === "ganho"}
          onClick={() => setKind("ganho")}
          className={`${toggleBase} ${kind === "ganho" ? toggleSelected : toggleInactive}`}
        >
          Ganhos extras
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === "gasto"}
          onClick={() => setKind("gasto")}
          className={`${toggleBase} ${kind === "gasto" ? toggleSelected : toggleInactive}`}
        >
          Gastos extras
        </button>
      </div>

      {/* key={kind} remonta a lista ao trocar a view, zerando o estado de edicao/modal */}
      <ExtrasList key={kind} kind={kind} />
    </div>
  );
}
