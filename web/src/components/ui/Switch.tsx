import { Switch as AriaSwitch, type SwitchProps } from "react-aria-components";
import { cn } from "../../lib/cn";

// toggle on/off — trilho fica verde (brand) quando ligado
export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 text-sm text-muted outline-none",
        className as string,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-surface-2 px-0.5 transition",
          "group-data-[selected]:border-brand group-data-[selected]:bg-brand-gradient",
          "group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-brand/40",
        )}
      >
        <span className="h-3.5 w-3.5 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-4" />
      </span>
      {children as React.ReactNode}
    </AriaSwitch>
  );
}
