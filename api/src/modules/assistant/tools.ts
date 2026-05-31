import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { monthRange } from "../../lib/month.js";
import { computeSurplus, round2 } from "../../lib/surplus.js";
import { buildAdvisorContext } from "../personal/context.js";
import {
  agregarGastosArgsSchema,
  avaliarCompraArgsSchema,
  buscarArgsSchema,
  projetarMesArgsSchema,
} from "./assistant.schemas.js";

// Ferramentas read-only que a IA pode chamar pra consultar o banco. REGRAS DE OURO:
// - toda query e SEMPRE escopada pelo userId (a IA nunca recebe userId; vem do servidor)
// - o termo de busca entra SEMPRE como parametro ($1, $2...), nunca concatenado em SQL. os
//   unicos identificadores interpolados (nomes de coluna) sao constantes minhas, nao input.
// - nada de escrita: so leitura. e impossivel a IA alterar/apagar dado por aqui.
// - busca insensivel a acento E maiuscula (unaccent + ILIKE) pra um app PT-BR achar tudo.
// - Decimal/Date sao convertidos pra number/string na borda antes de devolver.

// "YYYY-MM-DD" (data de calendario) -> Date meia-noite UTC, igual ao resto da app
function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// "YYYY-MM" do mes de uma data, em UTC
function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "YYYY-MM" -> { year, month1 } (month1 = 1..12)
function parseMonthKey(key: string): { year: number; month1: number } {
  return { year: Number(key.slice(0, 4)), month1: Number(key.slice(5, 7)) };
}

// avanca/recua N meses sobre uma chave "YYYY-MM" (UTC), normalizando o ano na virada
function addMonths(key: string, delta: number): string {
  const { year, month1 } = parseMonthKey(key);
  const d = new Date(Date.UTC(year, month1 - 1 + delta, 1));
  return monthKeyOf(d);
}

// projeta o valor mensal de uma fonte de renda num ano alvo (mesma regra da tela de Ganhos):
// - renda futura (startYear) so vale a partir do ano de inicio;
// - cada step fixa o valor naquele ano e o crescimento volta a contar a partir dele;
// - entre os pontos conhecidos, cresce pelo percentual anual (juros compostos).
function monthlyIncomeForYear(
  income: { monthlyAmount: number; annualGrowthPct: number; startYear: number | null; steps: { year: number; monthlyAmount: number }[] },
  year: number,
  currentYear: number,
): number {
  const baseYear = income.startYear ?? currentYear;
  if (year < baseYear) return 0;
  const knownPoints = [
    { year: baseYear, amount: income.monthlyAmount },
    ...income.steps.map((s) => ({ year: s.year, amount: s.monthlyAmount })),
  ];
  const anchor = knownPoints
    .filter((p) => p.year <= year)
    .reduce((latest, p) => (p.year > latest.year ? p : latest));
  return anchor.amount * Math.pow(1 + income.annualGrowthPct / 100, year - anchor.year);
}

// escapa os curingas do LIKE/ILIKE (\ % _) pra tratar o termo do usuario como literal,
// senao um "%" digitado viraria coringa e casaria itens errados
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// versao sem os "%" das pontas: match exato (case/acento-insensitive) pra igualdade de categoria
function exactPattern(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// monta "(unaccent(colA) ILIKE unaccent($p) OR unaccent(colB) ILIKE unaccent($p) ...)".
// `columns` sao identificadores estaticos definidos por mim (nunca input do usuario), entao
// interpola-los com Prisma.raw e seguro; o termo entra parametrizado.
function likeAny(columns: string[], pattern: string): Prisma.Sql {
  return Prisma.join(
    columns.map(
      (c) => Prisma.sql`unaccent(${Prisma.raw(`"${c}"`)}) ILIKE unaccent(${pattern})`,
    ),
    " OR ",
  );
}

// "AND col >= ini::date AND col < fim::date" quando ha filtro de mes; senao vazio. comparamos
// date com date (cast explicito) pra nao depender do fuso da sessao do banco.
function dateClause(col: string, range: { start: Date; end: Date } | null): Prisma.Sql {
  if (!range) return Prisma.empty;
  const ini = range.start.toISOString().slice(0, 10);
  const fim = range.end.toISOString().slice(0, 10);
  return Prisma.sql`AND ${Prisma.raw(`"${col}"`)} >= ${ini}::date AND ${Prisma.raw(`"${col}"`)} < ${fim}::date`;
}

// converte Decimal/string/number vindo do $queryRaw pra number de forma defensiva
function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (
    typeof v === "object" &&
    "toNumber" in (v as object) &&
    typeof (v as { toNumber?: unknown }).toNumber === "function"
  ) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

// declaracoes das ferramentas no formato do Gemini (subset do OpenAPI). a descricao e o que
// a IA le pra decidir quando chamar cada uma — por isso sao explicitas e em portugues.
export const toolDeclarations = [
  {
    name: "panorama",
    description:
      "Retorna a visão geral financeira COMPLETA do usuário: renda mensal, ganhos/gastos extras do mês, gastos fixos (item a item), gasto pessoal do mês por categoria (com limites), patrimônio por categoria, investimentos, fontes de renda, saldo do cofre, sobra estimada do mês e premissas de projeção. Use para perguntas amplas ('como estão minhas finanças?', 'onde posso economizar?') ou para achar gaps que o usuário não notaria.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "buscar",
    description:
      "Procura por um TEXTO em TODAS as fontes de dados do usuário (gastos fixos, gastos pessoais, extras, cartões, movimentos do cofre, investimentos/patrimônio e fontes de renda). Busca parcial, ignorando maiúsculas/minúsculas e acentos. Use sempre que o usuário citar um nome específico ('quanto gasto com Netflix?', 'tenho algo do Nubank?', 'achei uma cobrança da Amazon?'). Devolve os itens encontrados com fonte, descrição, categoria, valor e data.",
    parameters: {
      type: "OBJECT",
      properties: {
        termo: { type: "STRING", description: "texto a procurar (ex: 'netflix', 'uber', 'nubank')" },
        mes: { type: "STRING", description: "opcional, filtra itens datados por mês no formato AAAA-MM" },
        limite: { type: "NUMBER", description: "opcional, máximo de itens por fonte (1 a 30, padrão 15)" },
      },
      required: ["termo"],
    },
  },
  {
    name: "agregar_gastos",
    description:
      "Soma os gastos do usuário num período, agrupados por categoria ou por mês. Considera gastos pessoais (compras do dia a dia) e gastos extras (pontuais). Use para 'quanto gastei em delivery nos últimos meses?', 'qual minha maior categoria de gasto?', 'gastei mais em qual mês?'. Sem período informado, usa o mês atual.",
    parameters: {
      type: "OBJECT",
      properties: {
        de: { type: "STRING", description: "início do período (AAAA-MM-DD), inclusivo" },
        ate: { type: "STRING", description: "fim do período (AAAA-MM-DD), inclusivo" },
        agrupar_por: {
          type: "STRING",
          enum: ["categoria", "mes"],
          description: "como agrupar o total (padrão: categoria)",
        },
      },
    },
  },
  {
    name: "avaliar_compra",
    description:
      "Avalia se o usuário pode/deve fazer uma compra ou um gasto de um certo valor. Calcula com NÚMEROS reais: sobra do mês atual, quanto já gastou na categoria, o limite da categoria (se existir), o saldo do cofre e o impacto da compra. Devolve um veredito ('pode', 'cuidado' ou 'evite') baseado nesses números. Use sempre que o usuário perguntar se pode/deve comprar ou gastar algo.",
    parameters: {
      type: "OBJECT",
      properties: {
        valor: { type: "NUMBER", description: "valor da compra/gasto em reais" },
        categoria: { type: "STRING", description: "opcional, categoria da compra (ex: 'Lazer', 'Delivery')" },
        descricao: { type: "STRING", description: "opcional, o que é a compra (ex: 'tênis novo')" },
      },
      required: ["valor"],
    },
  },
  {
    name: "projetar_mes",
    description:
      "Projeta a sobra de um mês FUTURO (ou qualquer mês) com números reais: renda recorrente já considerando crescimento anual e rendas que começam naquele ano, gasto fixo mensal, gasto pessoal estimado pela média dos últimos meses, e a sobra esperada (otimista = só renda menos fixo; realista = também desconta o gasto pessoal médio). Use sempre que o usuário perguntar sobre um mês que ainda não chegou ('quanto vou sobrar mês que vem?', 'quanto posso gastar a mais em junho?'). Você mesma resolve qual é o mês a partir da data de hoje; só passe 'mes' se o usuário citar um mês específico.",
    parameters: {
      type: "OBJECT",
      properties: {
        mes: { type: "STRING", description: "opcional, mês alvo no formato AAAA-MM. Sem isso, projeta o próximo mês a partir de hoje" },
      },
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
      aporteMensalPlanejado: i.monthlyContribution,
      notas: i.notes,
    })),
    fontesDeRenda: ctx.incomes.map((i) => ({
      nome: i.name,
      valorMensal: round2(i.monthlyAmount),
      crescimentoAnualPct: i.annualGrowthPct,
      comecaEm: i.startYear,
    })),
    gatilhosDoUsuario: ctx.triggers,
    projecao: { horizonteAnos: ctx.horizonYears },
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

// buscar: roda um unaccent+ILIKE em cada fonte, sempre escopado por userId. itens datados
// podem ser filtrados por mes. cada fonte tem um teto de itens pra nao estourar o contexto.
async function buscar(userId: string, rawArgs: unknown, now: Date) {
  const parsed = buscarArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos inválidos" };
  }
  const { termo, mes, limite } = parsed.data;
  const take = limite ?? 15;
  const p = likePattern(termo);
  const range = mes ? monthRange(mes, now) : null;

  const [expenses, personal, extras, cards, cofre, investments, incomes] = await Promise.all([
    prisma.$queryRaw<{ descricao: string; valor: unknown }[]>`
      SELECT name AS descricao, amount AS valor
      FROM expenses
      WHERE "userId" = ${userId} AND (${likeAny(["name"], p)})
      ORDER BY "createdAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ descricao: string; categoria: string; valor: unknown; data: string }[]>`
      SELECT name AS descricao, category AS categoria, amount AS valor, to_char("spentAt", 'YYYY-MM-DD') AS data
      FROM personal_expenses
      WHERE "userId" = ${userId} AND (${likeAny(["name", "category"], p)}) ${dateClause("spentAt", range)}
      ORDER BY "spentAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ kind: string; descricao: string; categoria: string | null; valor: unknown; data: string }[]>`
      SELECT kind, description AS descricao, category AS categoria, amount AS valor, to_char("occurredAt", 'YYYY-MM-DD') AS data
      FROM extras
      WHERE "userId" = ${userId} AND (${likeAny(["description", "category"], p)}) ${dateClause("occurredAt", range)}
      ORDER BY "occurredAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ name: string; bank: string | null; brand: string | null; valor: unknown; includeInMonthly: boolean }[]>`
      SELECT name, bank, brand, "avgMonthlySpend" AS valor, "includeInMonthly"
      FROM credit_cards
      WHERE "userId" = ${userId} AND (${likeAny(["name", "bank", "brand"], p)})
      ORDER BY "createdAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ direction: string; source: string; notes: string | null; valor: unknown; data: string }[]>`
      SELECT direction, source, notes, amount AS valor, to_char("occurredAt", 'YYYY-MM-DD') AS data
      FROM cofre_movements
      WHERE "userId" = ${userId} AND (${likeAny(["notes", "source"], p)}) ${dateClause("occurredAt", range)}
      ORDER BY "occurredAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ kind: string; descricao: string; categoria: string; valor: unknown; notes: string | null }[]>`
      SELECT kind, name AS descricao, category AS categoria, value AS valor, notes
      FROM investments
      WHERE "userId" = ${userId} AND (${likeAny(["name", "category", "notes"], p)})
      ORDER BY "createdAt" DESC LIMIT ${take}`,
    prisma.$queryRaw<{ descricao: string; valor: unknown }[]>`
      SELECT name AS descricao, "monthlyAmount" AS valor
      FROM income_sources
      WHERE "userId" = ${userId} AND (${likeAny(["name"], p)})
      ORDER BY "createdAt" DESC LIMIT ${take}`,
  ]);

  const itens = [
    ...expenses.map((e) => ({
      fonte: "gasto fixo",
      descricao: e.descricao,
      categoria: null as string | null,
      valor: num(e.valor),
      data: null as string | null,
      observacao: "recorrente (todo mês)" as string | null,
    })),
    ...personal.map((pe) => ({
      fonte: "gasto pessoal",
      descricao: pe.descricao,
      categoria: pe.categoria,
      valor: num(pe.valor),
      data: pe.data,
      observacao: null as string | null,
    })),
    ...extras.map((e) => ({
      fonte: e.kind === "ganho" ? "ganho extra" : "gasto extra",
      descricao: e.descricao,
      categoria: e.categoria,
      valor: num(e.valor),
      data: e.data,
      observacao: "pontual" as string | null,
    })),
    ...cards.map((c) => ({
      fonte: "cartao de credito",
      descricao: [c.name, c.bank, c.brand].filter(Boolean).join(" / "),
      categoria: null as string | null,
      valor: num(c.valor),
      data: null as string | null,
      observacao: c.includeInMonthly ? "entra no gasto mensal" : "não entra no gasto mensal",
    })),
    ...cofre.map((m) => ({
      fonte: "cofre",
      descricao: m.notes ?? m.source,
      categoria: m.source as string | null,
      valor: num(m.valor),
      data: m.data,
      observacao: m.direction as string | null,
    })),
    ...investments.map((i) => ({
      fonte: i.kind === "patrimonio" ? "patrimonio" : "investimento",
      descricao: i.descricao,
      categoria: i.categoria,
      valor: num(i.valor),
      data: null as string | null,
      observacao: i.notes,
    })),
    ...incomes.map((i) => ({
      fonte: "fonte de renda",
      descricao: i.descricao,
      categoria: null as string | null,
      valor: num(i.valor),
      data: null as string | null,
      observacao: "mensal" as string | null,
    })),
  ];

  return { termo, mes: mes ?? null, encontrados: itens.length, itens };
}

// agregar_gastos: soma gastos pessoais + gastos extras num intervalo, agrupando por categoria
// ou por mes. sem periodo, usa o mes atual. devolve grupos ordenados do maior pro menor.
async function agregarGastos(userId: string, rawArgs: unknown, now: Date) {
  const parsed = agregarGastosArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos inválidos" };
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
    return { erro: "período inválido: 'de' precisa ser anterior a 'ate'" };
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

  for (const pe of personal) {
    const key = groupBy === "mes" ? monthKeyOf(pe.spentAt) : pe.category;
    add(key, pe.amount.toNumber());
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
    return { erro: parsed.error.issues[0]?.message ?? "argumentos inválidos" };
  }
  const { valor, categoria, descricao } = parsed.data;
  const month = monthKeyOf(now);
  const { start, end } = monthRange(month, now);

  // sobra do mes atual: conta autoritativa centralizada (mesma do fechamento do cofre)
  const sobraMes = await computeSurplus(userId, month, now);
  const saldoCofre = round2(await cofreBalance(userId));

  // gasto e limite da categoria (quando informada). o match e por unaccent+ILIKE exato pra
  // 'vestuario' casar 'Vestuário' (mesma regra de acento da busca)
  let gastoCategoria: number | null = null;
  let limiteCategoria: number | null = null;
  if (categoria) {
    const cat = exactPattern(categoria);
    const ini = start.toISOString().slice(0, 10);
    const fim = end.toISOString().slice(0, 10);
    const [sumRows, limitRows] = await Promise.all([
      prisma.$queryRaw<{ total: unknown }[]>`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM personal_expenses
        WHERE "userId" = ${userId}
          AND unaccent(category) ILIKE unaccent(${cat})
          AND "spentAt" >= ${ini}::date AND "spentAt" < ${fim}::date`,
      prisma.$queryRaw<{ amount: unknown }[]>`
        SELECT amount
        FROM category_limits
        WHERE "userId" = ${userId} AND unaccent(category) ILIKE unaccent(${cat})
        LIMIT 1`,
    ]);
    gastoCategoria = round2(num(sumRows[0]?.total));
    limiteCategoria = limitRows.length ? num(limitRows[0].amount) : null;
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
    motivo = "o valor supera a sobra do mês somada ao cofre, não há de onde tirar sem se endividar";
  } else if (valor > sobraMes) {
    veredito = "cuidado";
    motivo = "o valor passa da sobra do mês; cobriria a diferença tirando do cofre";
  } else if (estouraLimite) {
    veredito = "cuidado";
    motivo = "cabe na sobra do mês, mas estoura o limite da categoria";
  } else if (sobraMes > 0 && valor > sobraMes * 0.5) {
    veredito = "cuidado";
    motivo = "cabe na sobra, mas consome mais da metade dela";
  } else {
    veredito = "pode";
    motivo = "cabe tranquilo na sobra do mês sem comprometer o cofre nem o limite";
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

// projetar_mes: projeta a sobra de um mes (default = proximo mes). renda projetada pela
// mesma regra da tela de Ganhos (crescimento + steps + rendas futuras); gasto fixo recorrente;
// gasto pessoal estimado pela media dos ultimos meses COMPLETOS com lancamento (mes futuro nao
// tem gasto pessoal ainda, entao usar 0 inflaria a sobra — por isso a media historica).
async function projetarMes(userId: string, rawArgs: unknown, now: Date) {
  const parsed = projetarMesArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "argumentos inválidos" };
  }
  // mes alvo: o pedido, ou o proximo mes a partir de hoje
  const targetMonth = parsed.data.mes ?? addMonths(monthKeyOf(now), 1);
  const { year: targetYear } = parseMonthKey(targetMonth);
  const currentYear = now.getUTCFullYear();

  const [incomes, expenses, cards] = await Promise.all([
    prisma.incomeSource.findMany({ where: { userId }, include: { steps: true } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.creditCard.findMany({ where: { userId } }),
  ]);

  // renda recorrente projetada pro ano do mes alvo (cada fonte crescendo/comecando conforme regra)
  const rendaRecorrente = round2(
    incomes.reduce(
      (sum, i) =>
        sum +
        monthlyIncomeForYear(
          {
            monthlyAmount: i.monthlyAmount.toNumber(),
            annualGrowthPct: i.annualGrowthPct.toNumber(),
            startYear: i.startYear,
            steps: i.steps.map((s) => ({ year: s.year, monthlyAmount: s.monthlyAmount.toNumber() })),
          },
          targetYear,
          currentYear,
        ),
      0,
    ),
  );

  // gasto fixo mensal = despesas avulsas + cartoes marcados pra entrar no mensal
  const gastoFixo = round2(
    expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0) +
      cards.filter((c) => c.includeInMonthly).reduce((sum, c) => sum + c.avgMonthlySpend.toNumber(), 0),
  );

  // gasto pessoal medio dos ultimos 3 meses COMPLETOS (exclui o mes corrente, ainda em curso).
  // so conta meses que tiveram algum lancamento, pra media nao ser diluida por meses vazios.
  const LOOKBACK = 3;
  const curMonthKey = monthKeyOf(now);
  const porMes = new Map<string, number>();
  for (let i = 1; i <= LOOKBACK; i++) {
    const mk = addMonths(curMonthKey, -i);
    const { start, end } = monthRange(mk, now);
    const rows = await prisma.personalExpense.findMany({
      where: { userId, spentAt: { gte: start, lt: end } },
    });
    if (rows.length > 0) {
      porMes.set(mk, round2(rows.reduce((sum, p) => sum + p.amount.toNumber(), 0)));
    }
  }
  const mesesComGasto = [...porMes.values()];
  const gastoPessoalMedio = mesesComGasto.length
    ? round2(mesesComGasto.reduce((a, b) => a + b, 0) / mesesComGasto.length)
    : 0;

  const sobraOtimista = round2(rendaRecorrente - gastoFixo);
  const sobraRealista = round2(sobraOtimista - gastoPessoalMedio);

  return {
    mes: targetMonth,
    rendaRecorrente,
    gastoFixoMensal: gastoFixo,
    gastoPessoalMedioEstimado: gastoPessoalMedio,
    mesesUsadosNaMedia: porMes.size,
    sobraOtimista, // so renda - fixo (se nao gastar nada pessoal)
    sobraRealista, // desconta tambem o gasto pessoal medio
    observacao:
      porMes.size === 0
        ? "sem historico de gasto pessoal: a sobra realista assume gasto pessoal zero, o que e otimista"
        : `gasto pessoal estimado pela media de ${porMes.size} mes(es) recentes`,
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
    case "projetar_mes":
      return projetarMes(userId, args, now);
    default:
      return { erro: `ferramenta desconhecida: ${name}` };
  }
}
