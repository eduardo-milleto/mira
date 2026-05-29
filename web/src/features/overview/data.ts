import { BarChart3, CalendarDays, PieChart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BreakdownItem = { name: string; value: number; percent: number };

export type FeatureLink = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const featureLinks: FeatureLink[] = [
  { icon: CalendarDays, title: "Ganhos mensais", desc: "Acompanhe a evolução e a composição dos seus ganhos." },
  { icon: BarChart3, title: "Projeções", desc: "Veja suas projeções futuras." },
  { icon: Sparkles, title: "Sugestões IA", desc: "Receba sugestões personalizadas." },
  { icon: PieChart, title: "Investimentos", desc: "Acompanhe e faça seus investimentos." },
];
