// estilos do seletor de abas no topo das paginas (Dashboard / gerenciamento)
export const pageTabList =
  "inline-flex gap-1 rounded-xl border border-border bg-surface/60 p-1";

export const pageTabBase =
  "cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40";
export const pageTabInactive = "text-muted data-[hovered]:text-heading";
export const pageTabSelected = "bg-surface-2 text-heading shadow-card";

// helper pra montar a className de cada Tab a partir do estado de selecao
export const pageTabClass = ({ isSelected }: { isSelected: boolean }) =>
  `${pageTabBase} ${isSelected ? pageTabSelected : pageTabInactive}`;
