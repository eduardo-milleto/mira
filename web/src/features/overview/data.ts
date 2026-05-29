import { BarChart3, CalendarDays, Coins, PieChart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BreakdownItem = { name: string; value: number; percent: number };

// total de ganhos do mes (planilha, itens em azul) — usado como entrada do calculo de insights
export const monthlyIncome = 24870;

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
