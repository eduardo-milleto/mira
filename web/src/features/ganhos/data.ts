import { Briefcase, Building2, Landmark, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// dados do mes atual extraidos da planilha de investimentos (aba "Mes atual")
// itens em azul = ganhos. atualizar aqui a cada virada de mes ate existir backend.

export const totalThisMonth = 24870;

export type CompositionSlice = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

// cores distintas por categoria (uso semantico: diferenciar fontes de renda)
export const composition: CompositionSlice[] = [
  { name: "Salário", value: 14400, percent: 57.9, color: "#22c55e" },
  { name: "Aluguel + Empresa", value: 6650, percent: 26.7, color: "#3b82f6" },
  { name: "SAP", value: 2200, percent: 8.8, color: "#a855f7" },
  { name: "INSS", value: 1620, percent: 6.5, color: "#f59e0b" },
];

// no mes atual todas as fontes sao recorrentes
export const recurring = { value: 24870, percent: 100 };
export const variable = { value: 0, percent: 0 };

export type TopSource = {
  icon: LucideIcon;
  name: string;
  value: number;
  percent: number;
};

export const topSources: TopSource[] = [
  { icon: Briefcase, name: "Salário", value: 14400, percent: 57.9 },
  { icon: Building2, name: "Aluguel + Empresa", value: 6650, percent: 26.7 },
  { icon: Layers, name: "SAP", value: 2200, percent: 8.8 },
  { icon: Landmark, name: "INSS", value: 1620, percent: 6.5 },
];
