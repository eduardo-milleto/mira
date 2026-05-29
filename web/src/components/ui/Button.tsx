import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { cn } from "../../lib/cn";

type Variant = "primary" | "ghost" | "outline" | "danger";

type ButtonProps = AriaButtonProps & {
  variant?: Variant;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition " +
  "outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/60 data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-bg " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-black font-semibold shadow-glow data-[hovered]:brightness-110 data-[pressed]:brightness-95",
  ghost: "text-muted data-[hovered]:text-heading data-[hovered]:bg-white/5",
  outline: "border border-border text-heading data-[hovered]:bg-white/5 data-[pressed]:bg-white/10",
  danger:
    "bg-negative text-black font-semibold data-[hovered]:brightness-110 data-[pressed]:brightness-95",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={(renderProps) =>
        cn(
          base,
          variants[variant],
          typeof className === "function" ? className(renderProps) : className,
        )
      }
    />
  );
}
