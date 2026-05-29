import { InvestmentList } from "../investimentos/InvestmentList";

export function PatrimonioPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Patrimônio</h1>
        <p className="mt-2 text-sm font-light text-muted">
          Cadastre seus bens (imóvel, veículo e outros). Eles somam ao seu patrimônio total na Visão
          geral, separados dos investimentos.
        </p>
      </div>

      <InvestmentList kind="patrimonio" />
    </div>
  );
}
