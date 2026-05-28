import type { ReactNode } from "react";
import {
  TextField as AriaTextField,
  Input,
  Label,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import { cn } from "../../lib/cn";

type TextFieldProps = AriaTextFieldProps & {
  label: string;
  placeholder?: string;
  /** conteudo no canto direito do input, ex: botao de mostrar senha */
  endSlot?: ReactNode;
};

export function TextField({ label, placeholder, endSlot, className, ...props }: TextFieldProps) {
  return (
    <AriaTextField {...props} className={cn("flex flex-col gap-2", className as string)}>
      <Label className="text-sm text-muted">{label}</Label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-heading",
            "placeholder:text-faint outline-none transition",
            "data-[focused]:border-brand/60 data-[focused]:ring-2 data-[focused]:ring-brand/20",
            endSlot ? "pr-12" : null,
          )}
        />
        {endSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center">{endSlot}</div>
        )}
      </div>
    </AriaTextField>
  );
}
