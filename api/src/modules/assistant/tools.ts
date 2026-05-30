import { prisma } from "../../prisma.js";
import { monthRange } from "../../lib/month.js";
import { computeSurplus, round2 } from "../../lib/surplus.js";
import { buildAdvisorContext } from "../personal/context.js";
import {
  agregarGastosArgsSchema,
  avaliarCompraArgsSchema,
  buscarArgsSchema,
} from "./assistant.schemas.js";

// Ferramentas read-only que a IA pode chamar pra consultar o banco. REGRAS DE OURO:
// - toda query e SEMPRE escopada pelo userId (a IA nunca recebe userId; vem do servidor)
// - tudo parametrizado via Prisma (o termo de busca vira parametro, nunca SQL concatenado)
// - nada de escrita: so leitura. e impossivel a IA alterar/apagar dado por aqui.
// - Decimal/Date do Prisma sao convertidos pra number/string na borda antes de devolver.

// "YYYY-MM-DD" (data de calendario) -> Date meia-noite UTC, igual ao resto da app
function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// "YYYY-MM" do mes de uma data, em UTC
function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// declaracoes das ferramentas no formato do Gemini (subset do OpenAPI). a descricao e o que
// a IA le pra decidir quando chamar cada uma — por isso sao explicitas e em portugues.
export const toolDeclarations = [
  {
    name: "panorama",
    description:
      "Retorna a visao geral financeira COMPLETA do usuario: renda mensal, ganhos/gastos extras do mes, gastos fixos (item a item), gasto pessoal do mes por categoria (com limites), patrimonio por categoria, investimentos, fontes de renda, saldo do cofre, sobra estimada do mes e premissas de projecao. Use para perguntas amplas ('como estao minhas financas?', 'onde posso economizar?') ou para achar gaps que o usuario nao notaria.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "buscar",
    description:
      "Procura por um TEXTO em TODAS as fontes de dados do usuario (gastos fixos, gastos pessoais, extras, cartoes, movimentos do cofre, investimentos/patrimonio e fontes de renda). Busca parcial e sem diferenciar maiusculas/minusculas. Use sempre que o usuario citar um nome especifico ('quanto gasto com Netflix?', 'tenho algo do Nubank?', 'achei uma cobranca da Amazon?'). Devolve os itens encontrados com fonte, descricao, categoria, valor e data.",
    parameters: {
      type: "OBJECT",
      properties: {
        termo: { type: "STRING", description: "texto a procurar (ex: 'netflix', 'uber', 'nubank')" },
        mes: { type: "STRING", description: "opcional, filtra itens datados por mes no formato AAAA-MM" },
        limite: { type: "NUMBER", description: "opcional, maximo de itens por fonte (1 a 30, padrao 15)" },
      },
      required: ["termo"],
    },
  },
  {
    name: "agregar_gastos",
    description:
      "Soma os gastos do usuario num periodo, agrupados por categoria ou por mes. Considera gastos pessoais (compras do dia a dia) e gastos extras (pontuais). Use para 'quanto gastei em delivery nos ultimos meses?', 'qual minha maior categoria de gasto?', 'gastei mais em qual mes?'. Sem periodo informado, usa o mes atual.",
    parameters: {
      type: "OBJECT",
      properties: {
        de: { type: "STRING", description: "inicio do periodo (AAAA-MM-DD), inclusivo" },
        ate: { type: "STRING", description: "fim do periodo (AAAA-MM-DD), inclusivo" },
        agrupar_por: {
          type: "STRING",
          enum: ["categoria", "mes"],
          description: "como agrupar o total (padrao: categoria)",
        },
      },
    },
  },
  {
    name: "avaliar_compra",
    description:
      "Avalia se o usuario pode/deve fazer uma compra ou um gasto de um certo valor. Calcula com NUMEROS reais: sobra do mes atual, quanto ja gastou na categoria, o limite da categoria (se existir), o saldo do cofre e o impacto da compra. Devolve um veredito ('pode', 'cuidado' ou 'evite') baseado nesses numeros. Use sempre que o usuario perguntar se pode/deve comprar ou gastar algo.",
    parameters: {
      type: "OBJECT",
      properties: {
        valor: { type: "NUMBER", description: "valor da compra/gasto em reais" },
        categoria: { type: "STRING", description: "opcional, categoria da compra (ex: 'Lazer', 'Delivery')" },
        descricao: { type: "STRING", description: "opcional, o que e a compra (ex: 'tenis novo')" },
      },
      required: ["valor"],
    },
  },
];

// ---------- implementacao de cada ferramenta ----------

// panorama: reaproveita o contexto do advisor (fonte unica ja testada) e serializa pra JSON,
// com os numeros arredondados e as datas em AAAA-MM-DD. inclui a sobra estimada do mes.
async function panorama(userId: string, now: Date) {
  const ctx = await buildAdvisorContext(userId, now);
  const surplus = round2(
    ctx.monthlyIncome +
      ctx.extraGanhoTotal -
      ctx.fixedExpensesTotal -
      ctx.personalMonthTotal -
      ctx.extraGastoTotal,
  );

  return {
    mesAtual: monthKeyOf(now),
    rendaMensalRecorrente: round2(ctx.monthlyIncome),
    ganhosExtrasDoMes: round2(ctx.extraGanhoTotal),
    gastoFixoMensal: round2(ctx.fixedExpensesTotal),
    gastoPessoalDoMes: round2(ctx.personalMonthTotal),
    gastosExtrasDoMes: round2(ctx.extraGastoTotal),
    sobraEstimadaDoMes: surplus,
    patrimonioTotal: round2(ctx.netWorth),
    saldoCofre: round2(await cofreBalance(userId)),
    gastosFixos: ctx.fixedExpenses.map((e) => ({ nome: e.name, valor: round2(e.value) })),
    gastoPessoalPorCategoria: ctx.personalByCategory.map((c) => ({
      categoria: c.category,
      gasto: round2(c.spent),
    })),
    limites: ctx.limits.map((l) => ({ categoria: l.category, teto: round2(l.amount), origem: l.source })),
    patrimonioPorCategoria: ctx.assetBreakdown.map((a) => ({ categoria: a.name, valor: round2(a.value) })),
    investimentos: ctx.investments.map((i) => ({
      nome: i.name,
      categoria: i.category,
      valor: round2(i.value),
      rendimentoAnualPct: i.expectedReturnPct,
      notas: i.notes,
    })),
    fontesDeRenda: ctx.incomes.map((i) => ({
      nome: i.name,
      valorMensal: round2(i.monthlyAmount),
      crescimentoAnualPct: i.annualGrowthPct,
      comecaEm: i.startYear,
    })),
    gatilhosDoUsuario: ctx.triggers,
    projecao: { horizonteAnos: ctx.horizonYears, rendimentoSobraPct: ctx.returnRatePct },
  };
}

// saldo do cofre = soma das entradas menos as saidas (mesma conta da tela do cofre)
async function cofreBalance(userId: string): Promise<number> {
  const movements = await prisma.cofreMovement.findMany({ where: { userId } });
  return movements.reduce(
    (sum, m) => sum + (m.direction === "entrada" ? m.amount.toNumber() : -m.amount.toNumber()),
    0,
  );
}

// buscar: roda um contains case-insensitive em cada fonte, sempre escopado por userId. o
// termo entra como parametro do Prisma (jamais concatenado em SQL). itens datados podem ser
// filtrados por mes. cada fonte tem um teto de itens pra nao estourar o contexto da IA.
async function buscar(userId: string, rawArgs: unknown, now: Date) {
  const parsed = buscarArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos invalidos" };
  }
  const { termo, mes, limite } = parsed.data;
  const take = limite ?? 15;
  const like = { contains: termo, mode: "insensitive" as const };

  // filtro de mes (so vale pras fontes com data); quando ausente, nao restringe
  const range = mes ? monthRange(mes, now) : null;
  const dateFilter = range ? { gte: range.start, lt: range.end } : undefined;

  const [expenses, personal, extras, cards, cofre, investments, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, name: like },
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.personalExpense.findMany({
      where: { userId, OR: [{ name: like }, { category: like }], ...(dateFilter ? { spentAt: dateFilter } : {}) },
      take,
      orderBy: { spentAt: "desc" },
    }),
    prisma.extra.findMany({
      where: { userId, OR: [{ description: like }, { category: like }], ...(dateFilter ? { occurredAt: dateFilter } : {}) },
      take,
      orderBy: { occurredAt: "desc" },
    }),
    prisma.creditCard.findMany({
      where: { userId, OR: [{ name: like }, { bank: like }, { brand: like }] },
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.cofreMovement.findMany({
      where: { userId, OR: [{ notes: like }, { source: like }], ...(dateFilter ? { occurredAt: dateFilter } : {}) },
      take,
      orderBy: { occurredAt: "desc" },
    }),
    prisma.investment.findMany({
      where: { userId, OR: [{ name: like }, { category: like }, { notes: like }] },
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId, name: like },
      take,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const itens = [
    ...expenses.map((e) => ({
      fonte: "gasto fixo",
      descricao: e.name,
      categoria: null as string | null,
      valor: e.amount.toNumber(),
      data: null as string | null,
      observacao: "recorrente (todo mes)",
    })),
    ...personal.map((p) => ({
      fonte: "gasto pessoal",
      descricao: p.name,
      categoria: p.category,
      valor: p.amount.toNumber(),
      data: p.spentAt.toISOString().slice(0, 10),
      observacao: null as string | null,
    })),
    ...extras.map((e) => ({
      fonte: e.kind === "ganho" ? "ganho extra" : "gasto extra",
      descricao: e.description,
      categoria: e.category,
      valor: e.amount.toNumber(),
      data: e.occurredAt.toISOString().slice(0, 10),
      observacao: "pontual",
    })),
    ...cards.map((c) => ({
      fonte: "cartao de credito",
      descricao: [c.name, c.bank, c.brand].filter(Boolean).join(" / "),
      categoria: null,
      valor: c.avgMonthlySpend.toNumber(),
      data: null,
      observacao: c.includeInMonthly ? "entra no gasto mensal" : "nao entra no gasto mensal",
    })),
    ...cofre.map((m) => ({
      fonte: "cofre",
      descricao: m.notes ?? m.source,
      categoria: m.source,
      valor: m.amount.toNumber(),
      data: m.occurredAt.toISOString().slice(0, 10),
      observacao: m.direction,
    })),
    ...investments.map((i) => ({
      fonte: i.kind === "patrimonio" ? "patrimonio" : "investimento",
      descricao: i.name,
      categoria: i.category,
      valor: i.value.toNumber(),
      data: null,
      observacao: i.notes,
    })),
    ...incomes.map((i) => ({
      fonte: "fonte de renda",
      descricao: i.name,
      categoria: null,
      valor: i.monthlyAmount.toNumber(),
      data: null,
      observacao: "mensal",
    })),
  ];

  return {
    termo,
    mes: mes ?? null,
    encontrados: itens.length,
    itens,
  };
}

// agregar_gastos: soma gastos pessoais + gastos extras num intervalo, agrupando por categoria
// ou por mes. sem periodo, usa o mes atual. devolve grupos ordenados do maior pro menor.
async function agregarGastos(userId: string, rawArgs: unknown, now: Date) {
  const parsed = agregarGastosArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos invalidos" };
  }
  const { agrupar_por } = parsed.data;
  const groupBy = agrupar_por ?? "categoria";

  // intervalo: se nada veio, usa o mes atual; se so um lado veio, o outro vira o limite do mes atual
  const cur = monthRange(undefined, now);
  const start = parsed.data.de ? parseDate(parsed.data.de) : cur.start;
  // fim inclusivo: somamos < (ate + 1 dia) pra incluir o proprio dia 'ate'
  const end = parsed.data.ate
    ? new Date(parseDate(parsed.data.ate).getTime() + 24 * 60 * 60 * 1000)
    : cur.end;

  if (start >= end) {
    return { erro: "periodo invalido: 'de' precisa ser anterior a 'ate'" };
  }

  const [personal, extras] = await Promise.all([
    prisma.personalExpense.findMany({ where: { userId, spentAt: { gte: start, lt: end } } }),
    prisma.extra.findMany({ where: { userId, kind: "gasto", occurredAt: { gte: start, lt: end } } }),
  ]);

  const groups = new Map<string, { total: number; qtd: number }>();
  const add = (key: string, value: number) => {
    const g = groups.get(key) ?? { total: 0, qtd: 0 };
    g.total += value;
    g.qtd += 1;
    groups.set(key, g);
  };

  for (const p of personal) {
    const key = groupBy === "mes" ? monthKeyOf(p.spentAt) : p.category;
    add(key, p.amount.toNumber());
  }
  for (const e of extras) {
    const key = groupBy === "mes" ? monthKeyOf(e.occurredAt) : e.category ?? "Sem categoria";
    add(key, e.amount.toNumber());
  }

  const grupos = [...groups.entries()]
    .map(([chave, g]) => ({ chave, total: round2(g.total), qtd: g.qtd }))
    .sort((a, b) => b.total - a.total);
  const totalGeral = round2(grupos.reduce((sum, g) => sum + g.total, 0));

  return {
    de: start.toISOString().slice(0, 10),
    ate: new Date(end.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    agrupadoPor: groupBy,
    totalGeral,
    grupos,
  };
}

// avaliar_compra: monta o quadro real (sobra do mes, gasto/limite da categoria, cofre) e
// deriva um veredito por regras explicitas. a IA usa esses numeros pra explicar a decisao.
async function avaliarCompra(userId: string, rawArgs: unknown, now: Date) {
  const parsed = avaliarCompraArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos invalidos" };
  }
  const { valor, categoria, descricao } = parsed.data;
  const month = monthKeyOf(now);
  const { start, end } = monthRange(month, now);

  // sobra do mes atual: conta autoritativa centralizada (mesma do fechamento do cofre)
  const sobraMes = await computeSurplus(userId, month, now);
  const saldoCofre = round2(await cofreBalance(userId));

  // gasto e limite da categoria (quando informada)
  let gastoCategoria: number | null = null;
  let limiteCategoria: number | null = null;
  if (categoria) {
    const [personal, limit] = await Promise.all([
      prisma.personalExpense.findMany({
        where: { userId, category: { equals: categoria, mode: "insensitive" }, spentAt: { gte: start, lt: end } },
      }),
      prisma.categoryLimit.findFirst({
        where: { userId, category: { equals: categoria, mode: "insensitive" } },
      }),
    ]);
    gastoCategoria = round2(personal.reduce((sum, p) => sum + p.amount.toNumber(), 0));
    limiteCategoria = limit ? limit.amount.toNumber() : null;
  }

  const sobraApos = round2(sobraMes - valor);
  // de onde sairia o dinheiro: primeiro a sobra do mes, o que faltar vem do cofre
  const fonteFolga = round2(sobraMes + saldoCofre);
  const estouraLimite =
    limiteCategoria != null && gastoCategoria != null && gastoCategoria + valor > limiteCategoria;

  // veredito por regras duras sobre numeros reais (a IA so explica, nao inventa o veredito)
  let veredito: "pode" | "cuidado" | "evite";
  let motivo: string;
  if (valor > fonteFolga) {
    veredito = "evite";
    motivo = "o valor supera a sobra do mes somada ao cofre — nao ha de onde tirar sem se endividar";
  } else if (valor > sobraMes) {
    veredito = "cuidado";
    motivo = "o valor passa da sobra do mes; cobriria a diferenca tirando do cofre";
  } else if (estouraLimite) {
    veredito = "cuidado";
    motivo = "cabe na sobra do mes, mas estoura o limite da categoria";
  } else if (sobraMes > 0 && valor > sobraMes * 0.5) {
    veredito = "cuidado";
    motivo = "cabe na sobra, mas consome mais da metade dela";
  } else {
    veredito = "pode";
    motivo = "cabe tranquilo na sobra do mes sem comprometer o cofre nem o limite";
  }

  return {
    compra: { valor, categoria: categoria ?? null, descricao: descricao ?? null },
    mes: month,
    sobraMes,
    sobraApos,
    saldoCofre,
    gastoCategoriaNoMes: gastoCategoria,
    limiteCategoria,
    estouraLimite,
    veredito,
    motivo,
  };
}

// dispatcher: recebe o nome da ferramenta e os argumentos crus da IA, executa e devolve o
// resultado (sempre um objeto JSON-friendly). nome desconhecido vira erro legivel pra IA.
export async function executeTool(
  userId: string,
  name: string,
  args: unknown,
  now: Date,
): Promise<unknown> {
  switch (name) {
    case "panorama":
      return panorama(userId, now);
    case "buscar":
      return buscar(userId, args, now);
    case "agregar_gastos":
      return agregarGastos(userId, args, now);
    case "avaliar_compra":
      return avaliarCompra(userId, args, now);
    default:
      return { erro: `ferramenta desconhecida: ${name}` };
  }
}
