import { Checkbox as AriaCheckbox, type CheckboxProps } from "react-aria-components";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={cn(
        "group flex cursor-pointer items-center gap-2 text-sm text-muted outline-none",
        className as string,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-md border border-border bg-surface-2 transition",
          "group-data-[selected]:border-brand group-data-[selected]:bg-brand-gradient",
          "group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-brand/40",
        )}
      >
        <Check className="h-3.5 w-3.5 text-black opacity-0 transition group-data-[selected]:opacity-100" />
      </span>
      {children as React.ReactNode}
    </AriaCheckbox>
  );
}
