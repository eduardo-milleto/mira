import { BarChart3, CalendarDays, Coins, PieChart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BreakdownItem = { name: string; value: number; percent: number };

// total de ganhos do mes (planilha, itens em azul) — usado como entrada do calculo de insights
export const monthlyIncome = 24870;

// gastos do mes atual (planilha, aba "Mes atual" — itens em vermelho)
export const monthlySpending = 19456;
export const spendingBreakdown: BreakdownItem[] = [
  { name: "Aluguel AP", value: 7050, percent: 36.2 },
  { name: "Consórcio + Carta", value: 5883, percent: 30.2 },
  { name: "Banrisul + Dev", value: 2200, percent: 11.3 },
  { name: "Nubank + Vagas + MercadoPago + Inter", value: 1363, percent: 7.0 },
  { name: "Clube + Facul + Smart", value: 1360, percent: 7.0 },
  { name: "Itaú (Comida + Gasolina)", value: 1000, percent: 5.1 },
  { name: "Seguro + Claro", value: 600, percent: 3.1 },
];

// patrimonio = soma das reservas/investimentos (planilha, tabela Investimentos)
export const netWorth = 634500;
export const assetBreakdown: BreakdownItem[] = [
  { name: "Renda Passiva", value: 185000, percent: 29.2 },
  { name: "Patrimônio", value: 163000, percent: 25.7 },
  { name: "Férias", value: 100000, percent: 15.8 },
  { name: "Investimentos", value: 93000, percent: 14.7 },
  { name: "Advogado", value: 50000, percent: 7.9 },
  { name: "Deus", value: 43000, percent: 6.8 },
  { name: "Reserva em Real", value: 500, percent: 0.1 },
];

export type FeatureLink = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const featureLinks: FeatureLink[] = [
  { icon: CalendarDays, title: "Ganhos mensais", desc: "Acompanhe a evolução e a composição dos seus ganhos." },
  { icon: BarChart3, title: "Projeções", desc: "Veja suas projeções futuras." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba sugestões personalizadas." },
  { icon: Coins, title: "Potenciais rendas", desc: "Descubra novas formas de aumentar sua renda." },
  { icon: PieChart, title: "Investimentos", desc: "Acompanhe e faça seus investimentos." },
];
