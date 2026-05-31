import type { Investment } from "./investimentos.api";

// um ponto do grafico: o ano, o total daquele ano e o valor projetado de cada ativo (assetKey).
// o assetKey e indexado (a0, a1...) pra nao colidir quando dois ativos tem o mesmo nome.
export type ProjectionRow = {
  year: string;
  total: number;
  [assetKey: string]: number | string;
};

export type ProjectionAsset = {
  key: string; // chave usada como dataKey no grafico (a0, a1...)
  name: string;
  category: string;
};

export type InvestmentProjection = {
  rows: ProjectionRow[];
  assets: ProjectionAsset[];
};

// taxa anual efetiva do ativo: a realizada do historico quando existe, senao a expectativa
// manual, senao 0 (ativo nao rende). mesma regra usada pra alimentar os insights.
function effectiveAnnualRate(inv: Investment): number {
  return (inv.realizedReturnPct ?? inv.expectedReturnPct ?? 0) / 100;
}

// valor de um ativo apos N meses: capital inicial rendendo em juros compostos + aporte mensal
// somado todo mes (e o que ja foi aportado tambem passa a render). formula fechada da serie.
// quando a taxa mensal e ~0, vira soma simples (V0 + aporte * N).
function projectAsset(value0: number, monthlyRate: number, monthly: number, months: number): number {
  if (Math.abs(monthlyRate) < 1e-9) {
    return value0 + monthly * months;
  }
  const growth = Math.pow(1 + monthlyRate, months);
  const principal = value0 * growth;
  const contributions = monthly * ((growth - 1) / monthlyRate);
  return principal + contributions;
}

// projeta cada investimento ano a ano (juros compostos por ativo + aporte mensal planejado).
// determinista de proposito: o total e sempre a soma dos ativos, e cada ativo so cresce pela
// propria taxa — espelha a premissa honesta da projecao (a sobra do cofre NAO entra aqui).
export function projectInvestments(
  investments: Investment[],
  horizonYears: number,
  currentYear: number,
): InvestmentProjection {
  const assets: ProjectionAsset[] = investments.map((inv, i) => ({
    key: `a${i}`,
    name: inv.name,
    category: inv.category,
  }));

  // taxa mensal equivalente a anual: (1 + r)^(1/12) - 1; base <= 0 trava em -100%/mes
  const prepared = investments.map((inv) => {
    const annual = effectiveAnnualRate(inv);
    const base = 1 + annual;
    const monthlyRate = base > 0 ? Math.pow(base, 1 / 12) - 1 : -1;
    return { value0: inv.value, monthlyRate, monthly: inv.monthlyContribution ?? 0 };
  });

  const rows: ProjectionRow[] = [];
  // um ponto por ano, de currentYear (ano 0 = valor atual) ate o fim do horizonte
  for (let y = 0; y < horizonYears; y++) {
    const months = y * 12;
    const row: ProjectionRow = { year: String(currentYear + y), total: 0 };
    let total = 0;
    prepared.forEach((p, i) => {
      const v = Math.round(projectAsset(p.value0, p.monthlyRate, p.monthly, months));
      row[assets[i].key] = v;
      total += v;
    });
    row.total = total;
    rows.push(row);
  }

  return { rows, assets };
}

// tons de verde (semantico: tudo e capital) pra distinguir os ativos na pilha sem inventar cor.
// do mais claro pro mais escuro; cicla se houver mais ativos que tons.
const GREEN_SHADES = [
  "#86efac",
  "#4ade80",
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#166534",
  "#14532d",
];

export function assetShade(index: number): string {
  return GREEN_SHADES[index % GREEN_SHADES.length];
}
