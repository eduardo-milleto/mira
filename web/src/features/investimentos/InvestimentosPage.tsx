import { InvestmentList } from "./InvestmentList";
import { PatrimonyProjectionCard } from "./PatrimonyProjectionCard";

export function InvestimentosPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Investimentos</h1>
        <p className="mt-2 text-sm font-light text-muted">
          Cadastre e classifique seus ativos. Eles compõem o seu patrimônio na Visão geral e alimentam
          a projeção da Mira.
        </p>
      </div>

      <PatrimonyProjectionCard />
      <InvestmentList />
    </div>
  );
}
