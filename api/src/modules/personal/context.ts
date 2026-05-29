import { prisma } from "../../prisma.js";
import { monthRange } from "../../lib/month.js";

// snapshot financeiro completo do usuario, montado 100% a partir do banco.
// alimenta tanto o chat da consultora quanto a sugestao de limites.
export type AdvisorContext = {
  monthlyIncome: number;
  extraGanhoTotal: number;
  extraGastoTotal: number;
  fixedExpensesTotal: number;
  fixedExpenses: { name: string; value: number }[];
  netWorth: number;
  assetBreakdown: { name: string; value: number }[];
  personalMonthTotal: number;
  personalByCategory: { category: string; spent: number }[];
  recentPersonal: { name: string; category: string; amount: number; spentAt: Date }[];
  limits: { category: string; amount: number; source: string }[];
  triggers: string | null;
  incomes: { name: string; monthlyAmount: number; annualGrowthPct: number; startYear: number | null }[];
  investments: { name: string; category: string; value: number; expectedReturnPct: number | null; notes: string | null }[];
  returnRatePct: number;
  horizonYears: number;
};

const DEFAULT_RETURN_RATE = 10;
const DEFAULT_HORIZON = 5;

export async function buildAdvisorContext(userId: string, now: Date): Promise<AdvisorContext> {
  const { start, end } = monthRange(undefined, now);
  const currentYear = now.getUTCFullYear();

  // uma rodada de queries, todas escopadas pelo userId (sem vazar dado de outro usuario)
  const [expenses, cards, incomes, investments, settings, personal, limits, profile, extras] =
    await Promise.all([
      prisma.expense.findMany({ where: { userId } }),
      prisma.creditCard.findMany({ where: { userId } }),
      prisma.incomeSource.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.projectionSettings.findUnique({ where: { userId } }),
      prisma.personalExpense.findMany({
        where: { userId, spentAt: { gte: start, lt: end } },
        orderBy: { spentAt: "desc" },
      }),
      prisma.categoryLimit.findMany({ where: { userId } }),
      prisma.spendingProfile.findUnique({ where: { userId } }),
      prisma.extra.findMany({ where: { userId, occurredAt: { gte: start, lt: end } } }),
    ]);

  // renda mensal = fontes ja ativas (rendas futuras so contam a partir do startYear)
  const monthlyIncome = incomes
    .filter((i) => i.startYear == null || i.startYear <= currentYear)
    .reduce((sum, i) => sum + i.monthlyAmount.toNumber(), 0);

  // gasto fixo mensal = gastos avulsos + cartoes marcados pra entrar no mensal
  const fixedExpenses = [
    ...expenses.map((e) => ({ name: e.name, value: e.amount.toNumber() })),
    ...cards
      .filter((c) => c.includeInMonthly)
      .map((c) => ({ name: c.name, value: c.avgMonthlySpend.toNumber() })),
  ];
  const fixedExpensesTotal = fixedExpenses.reduce((sum, e) => sum + e.value, 0);

  // patrimonio = investimentos agrupados por categoria
  const byAsset = new Map<string, number>();
  for (const inv of investments) {
    byAsset.set(inv.category, (byAsset.get(inv.category) ?? 0) + inv.value.toNumber());
  }
  const netWorth = investments.reduce((sum, i) => sum + i.value.toNumber(), 0);
  const assetBreakdown = [...byAsset.entries()].map(([name, value]) => ({ name, value }));

  // gasto pessoal do mes: total, soma por categoria e as compras recentes
  const byPersonal = new Map<string, number>();
  for (const p of personal) {
    byPersonal.set(p.category, (byPersonal.get(p.category) ?? 0) + p.amount.toNumber());
  }
  const personalMonthTotal = personal.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const personalByCategory = [...byPersonal.entries()].map(([category, spent]) => ({ category, spent }));

  // ganhos/gastos extras do mes (pontuais): entram no caixa do mes, mas nao na renda recorrente
  let extraGanhoTotal = 0;
  let extraGastoTotal = 0;
  for (const e of extras) {
    const value = e.amount.toNumber();
    if (e.kind === "ganho") extraGanhoTotal += value;
    else extraGastoTotal += value;
  }

  return {
    monthlyIncome,
    extraGanhoTotal,
    extraGastoTotal,
    fixedExpensesTotal,
    fixedExpenses,
    netWorth,
    assetBreakdown,
    personalMonthTotal,
    personalByCategory,
    recentPersonal: personal.slice(0, 30).map((p) => ({
      name: p.name,
      category: p.category,
      amount: p.amount.toNumber(),
      spentAt: p.spentAt,
    })),
    limits: limits.map((l) => ({ category: l.category, amount: l.amount.toNumber(), source: l.source })),
    triggers: profile?.triggers?.trim() ? profile.triggers.trim() : null,
    incomes: incomes.map((i) => ({
      name: i.name,
      monthlyAmount: i.monthlyAmount.toNumber(),
      annualGrowthPct: i.annualGrowthPct.toNumber(),
      startYear: i.startYear,
    })),
    investments: investments.map((i) => ({
      name: i.name,
      category: i.category,
      value: i.value.toNumber(),
      expectedReturnPct: i.expectedReturnPct?.toNumber() ?? null,
      notes: i.notes,
    })),
    returnRatePct: settings?.returnRatePct.toNumber() ?? DEFAULT_RETURN_RATE,
    horizonYears: settings?.horizonYears ?? DEFAULT_HORIZON,
  };
}

// monta o bloco de texto com todo o contexto financeiro pra enviar ao Gemini.
// usado pelo chat e pela sugestao de limites.
export function formatContext(ctx: AdvisorContext): string {
  const lines: string[] = [];
  const surplus =
    ctx.monthlyIncome +
    ctx.extraGanhoTotal -
    ctx.fixedExpensesTotal -
    ctx.personalMonthTotal -
    ctx.extraGastoTotal;

  lines.push(`Renda mensal recorrente: R$ ${ctx.monthlyIncome}`);
  lines.push(`Ganhos extras neste mes (pontuais): R$ ${ctx.extraGanhoTotal}`);
  lines.push(`Gasto fixo mensal: R$ ${ctx.fixedExpensesTotal}`);
  lines.push(`Gasto pessoal ja feito neste mes: R$ ${ctx.personalMonthTotal}`);
  lines.push(`Gastos extras neste mes (pontuais): R$ ${ctx.extraGastoTotal}`);
  lines.push(`Sobra estimada do mes (renda + extras - fixo - pessoal - gastos extras): R$ ${surplus}`);
  lines.push(`Patrimonio atual: R$ ${ctx.netWorth}`);
  lines.push("");

  lines.push("Gastos fixos por item:");
  lines.push(ctx.fixedExpenses.length ? ctx.fixedExpenses.map((e) => `- ${e.name}: R$ ${e.value}`).join("\n") : "(nenhum)");
  lines.push("");

  lines.push("Patrimonio por categoria:");
  lines.push(ctx.assetBreakdown.length ? ctx.assetBreakdown.map((a) => `- ${a.name}: R$ ${a.value}`).join("\n") : "(nenhum)");
  lines.push("");

  lines.push("Gasto pessoal do mes por categoria (com limite quando definido):");
  if (ctx.personalByCategory.length || ctx.limits.length) {
    const cats = new Set([
      ...ctx.personalByCategory.map((c) => c.category),
      ...ctx.limits.map((l) => l.category),
    ]);
    for (const cat of cats) {
      const spent = ctx.personalByCategory.find((c) => c.category === cat)?.spent ?? 0;
      const limit = ctx.limits.find((l) => l.category === cat);
      const limitTxt = limit ? ` (limite R$ ${limit.amount}${limit.source === "ai" ? ", sugerido pela IA" : ""})` : " (sem limite)";
      lines.push(`- ${cat}: R$ ${spent}${limitTxt}`);
    }
  } else {
    lines.push("(nenhum gasto pessoal neste mes)");
  }
  lines.push("");

  lines.push("Compras pessoais recentes (data, item, categoria, valor):");
  if (ctx.recentPersonal.length) {
    lines.push(
      ctx.recentPersonal
        .map((p) => `- ${p.spentAt.toISOString().slice(0, 10)} ${p.name} [${p.category}]: R$ ${p.amount}`)
        .join("\n"),
    );
  } else {
    lines.push("(nenhuma)");
  }
  lines.push("");

  lines.push("Fontes de renda (premissa de crescimento e rendas futuras):");
  lines.push(
    ctx.incomes.length
      ? ctx.incomes
          .map((i) => {
            const when = i.startYear ? `, comeca em ${i.startYear}` : "";
            return `- ${i.name}: R$ ${i.monthlyAmount}/mes (cresce ${i.annualGrowthPct}%/ano)${when}`;
          })
          .join("\n")
      : "(nao informado)",
  );
  lines.push("");

  lines.push("Investimentos (premissa de rendimento por ativo):");
  lines.push(
    ctx.investments.length
      ? ctx.investments
          .map((i) => {
            const rate = i.expectedReturnPct != null ? `rende ${i.expectedReturnPct}%/ano` : "taxa a inferir";
            const notes = i.notes ? ` — ${i.notes}` : "";
            return `- ${i.name} [${i.category}]: R$ ${i.value} (${rate})${notes}`;
          })
          .join("\n")
      : "(nao informado)",
  );
  lines.push("");

  lines.push(`Premissas de projecao: horizonte ${ctx.horizonYears} anos, sobra investida rende ${ctx.returnRatePct}%/ano.`);
  lines.push("");

  lines.push("Gatilhos/contexto que o usuario descreveu:");
  lines.push(ctx.triggers ?? "(nao informado — infira possiveis padroes/gatilhos pelo historico de compras acima)");

  return lines.join("\n");
}
