import {
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";

type ComboboxFieldProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// combobox searchable (padrao do projeto): input inline + busca + dropdown filtrado.
// allowsCustomValue deixa digitar um banco fora da lista (caso "Outro").
export function ComboboxField({
  label,
  options,
  value,
  onChange,
  placeholder,
}: ComboboxFieldProps) {
  // com inputValue controlado o react-aria nao filtra sozinho — filtramos na mao
  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query))
    : options;

  return (
    <ComboBox
      aria-label={label}
      inputValue={value}
      onInputChange={onChange}
      items={filtered.map((name) => ({ id: name, name }))}
      allowsCustomValue
      menuTrigger="focus"
      className="flex flex-col gap-2"
    >
      <Label className="text-sm text-muted">{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-border bg-surface-2 py-3 pl-10 pr-10 text-sm text-heading",
            "placeholder:text-faint outline-none transition",
            "data-[focused]:border-brand/60 data-[focused]:ring-2 data-[focused]:ring-brand/20",
          )}
        />
        <ChevronsUpDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
      <Popover className="w-[var(--trigger-width)] rounded-xl border border-border bg-surface-2 p-1 shadow-card outline-none">
        <ListBox
          className="max-h-60 overflow-auto outline-none"
          renderEmptyState={() => (
            <p className="px-3 py-2 text-sm text-faint">Nenhum banco encontrado</p>
          )}
        >
          {(item: { id: string; name: string }) => (
            <ListBoxItem
              id={item.id}
              textValue={item.name}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted outline-none data-[focused]:bg-white/5 data-[focused]:text-heading data-[selected]:text-heading"
            >
              {({ isSelected }) => (
                <>
                  {item.name}
                  {isSelected && <Check className="h-4 w-4 text-brand" />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
