// categorias sugeridas pra classificar ativos. listas fixas (nao vao pro .env) e o
// combobox aceita valor livre, entao uma categoria fora da lista tambem funciona.

// investimentos = ativos financeiros / renda passiva
export const INVESTMENT_CATEGORIES = [
  "Renda Fixa",
  "Renda Variável",
  "Fundos Imobiliários",
  "Cripto",
  "Trade",
  "Previdência",
  "Reserva de Emergência",
  "Tesouro Direto",
  "Ações",
  "Exterior",
];

// patrimonio = bens que o usuario possui
export const PATRIMONY_CATEGORIES = [
  "Imóvel",
  "Veículo",
  "Terreno",
  "Joias/Relógios",
  "Obras de arte",
  "Empresa/Participação",
  "Outros bens",
];

import type { InvestmentKind } from "./investimentos.api";

// devolve a lista de categorias certa pro tipo de ativo
export function categoriesForKind(kind: InvestmentKind): string[] {
  return kind === "patrimonio" ? PATRIMONY_CATEGORIES : INVESTMENT_CATEGORIES;
}
