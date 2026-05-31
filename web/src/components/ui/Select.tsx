import type { ReactNode } from "react";
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Check, ChevronsUpDown } from "lucide-react";

type Option<T extends string> = { value: T; label: string };

type SelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  // aria-label (o gatilho mostra o label da opcao selecionada)
  label: string;
  icon?: ReactNode;
};

// dropdown custom (sem <select> nativo) seguindo o visual dos menus do sistema.
// usado para ordenar/filtrar listas.
export function Select<T extends string>({ value, onChange, options, label, icon }: SelectProps<T>) {
  const current = options.find((o) => o.value === value);

  return (
    <MenuTrigger>
      <AriaButton
        aria-label={label}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-heading outline-none transition hover:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40"
      >
        {icon && <span className="text-faint">{icon}</span>}
        <span>{current?.label ?? label}</span>
        <ChevronsUpDown className="h-4 w-4 text-faint" />
      </AriaButton>
      <Popover className="max-h-72 w-52 overflow-auto rounded-xl border border-border bg-surface-2 p-1 shadow-card outline-none">
        <Menu className="outline-none" onAction={(key) => onChange(String(key) as T)}>
          {options.map((o) => (
            <MenuItem
              key={o.value}
              id={o.value}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted outline-none data-[focused]:bg-white/5 data-[focused]:text-heading"
            >
              <span>{o.label}</span>
              {o.value === value && <Check className="h-4 w-4 text-brand" />}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
