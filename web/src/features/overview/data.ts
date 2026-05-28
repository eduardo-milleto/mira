import { BarChart3, CalendarDays, Coins, PieChart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ATENCAO: dados ilustrativos. serao substituidos pelos backends de cada modulo
// (gastos, projecoes, etc) conforme forem construidos.

export const spendingData = [
  { month: "Jan", value: 3200 },
  { month: "Fev", value: 3100 },
  { month: "Mar", value: 5200 },
  { month: "Abr", value: 4000 },
  { month: "Mai", value: 5100 },
  { month: "Jun", value: 4389.6 },
];

export const projectionData = [
  { year: "2025", value: 96000 },
  { year: "2026", value: 110000 },
  { year: "2027", value: 124000 },
  { year: "2028", value: 150000 },
  { year: "2029", value: 178000 },
];

export type EvolutionStep = {
  label: string;
  percent: number;
  status: string;
  done?: boolean;
};

export const evolutionSteps: EvolutionStep[] = [
  { label: "Hoje", percent: 78, status: "Boa", done: true },
  { label: "Próximo objetivo", percent: 85, status: "Muito boa" },
  { label: "Em 6 meses", percent: 90, status: "Excelente" },
  { label: "Liberdade financeira", percent: 100, status: "Liberdade" },
];

export type FeatureLink = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const featureLinks: FeatureLink[] = [
  { icon: CalendarDays, title: "Gastos mensais", desc: "Acompanhe, categorize e reduza seus gastos." },
  { icon: BarChart3, title: "Projeções", desc: "Veja suas projeções futuras." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba sugestões personalizadas." },
  { icon: Coins, title: "Potenciais rendas", desc: "Descubra novas formas de aumentar sua renda." },
  { icon: PieChart, title: "Investimentos", desc: "Acompanhe e faça seus investimentos." },
];
