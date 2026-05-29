import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
import { monthLabel, recentMonths } from "../../lib/month";

type Props = {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
  count?: number; // quantos meses recentes oferecer
};

// seletor de mes custom (sem <select> nativo): botao + dropdown com os ultimos meses,
// seguindo o visual dos menus do sistema (rounded-xl, border, surface-2, blur).
export function MonthSelect({ value, onChange, count = 12 }: Props) {
  const months = recentMonths(count);

  return (
    <MenuTrigger>
      <AriaButton className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-heading outline-none transition hover:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40">
        <Calendar className="h-4 w-4 text-faint" />
        <span>{monthLabel(value)}</span>
        <ChevronsUpDown className="h-4 w-4 text-faint" />
      </AriaButton>
      <Popover className="max-h-72 w-56 overflow-auto rounded-xl border border-border bg-surface-2 p-1 shadow-card outline-none">
        <Menu className="outline-none" onAction={(key) => onChange(String(key))}>
          {months.map((m) => (
            <MenuItem
              key={m}
              id={m}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted outline-none data-[focused]:bg-white/5 data-[focused]:text-heading"
            >
              <span>{monthLabel(m)}</span>
              {m === value && <Check className="h-4 w-4 text-brand" />}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
