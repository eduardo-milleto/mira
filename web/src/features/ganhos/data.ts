import { Boxes, Building2, Globe, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ATENCAO: dados ilustrativos. serao substituidos pelo backend de ganhos quando existir.

export const totalThisMonth = 18420;

export const earningsEvolution = [
  { month: "Jan", value: 9200 },
  { month: "Fev", value: 11000 },
  { month: "Mar", value: 12400 },
  { month: "Abr", value: 12100 },
  { month: "Mai", value: 14300 },
  { month: "Jun", value: 18420 },
];

export type CompositionSlice = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

// cores distintas por categoria (uso semantico: diferenciar fontes de renda)
export const composition: CompositionSlice[] = [
  { name: "Freelance", value: 7260, percent: 39.4, color: "#22c55e" },
  { name: "Salário", value: 6120, percent: 33.2, color: "#3b82f6" },
  { name: "Projetos", value: 3180, percent: 17.3, color: "#a855f7" },
  { name: "Comissões", value: 1320, percent: 7.2, color: "#f59e0b" },
  { name: "Outras rendas", value: 540, percent: 2.9, color: "#9ca3af" },
];

export const recurring = { value: 12240, percent: 66.4, delta: 18.7 };
export const variable = { value: 6180, percent: 33.6, delta: 52.1 };

export type TopSource = {
  icon: LucideIcon;
  name: string;
  value: number;
  percent: number;
};

export const topSources: TopSource[] = [
  { icon: Building2, name: "Cliente Alpha", value: 4520, percent: 24.5 },
  { icon: Layers, name: "Empresa XYZ", value: 3600, percent: 19.5 },
  { icon: Globe, name: "Projeto Website", value: 2880, percent: 15.6 },
  { icon: Boxes, name: "Plataforma Beta", value: 2160, percent: 11.7 },
];

export const monthStats = [
  { label: "Melhor dia", value: "28 Mai", sub: "R$ 1.320,00" },
  { label: "Média diária", value: "R$ 614,00", sub: "↑ 24,2%", subPositive: true },
  { label: "Sequência positiva", value: "15 dias", sub: "Recorde!" },
  { label: "Meta do mês", value: "92%", sub: "R$ 20.000,00" },
];
