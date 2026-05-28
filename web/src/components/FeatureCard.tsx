import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

// card de atalho de modulo, com brilho verde no rodape (igual ao mockup)
export function FeatureCard({ icon: Icon, title, desc }: FeatureCardProps) {
  return (
    <button
      type="button"
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface/80 p-5 text-left backdrop-blur transition hover:border-brand/40 hover:bg-surface-2"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-heading">{title}</p>
          <p className="mt-1 text-xs text-faint">{desc}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition group-hover:text-brand" />
      </div>
      {/* brilho verde no rodape */}
      <span className="pointer-events-none absolute -bottom-6 left-1/2 h-12 w-2/3 -translate-x-1/2 rounded-full bg-brand/30 blur-2xl transition group-hover:bg-brand/50" />
    </button>
  );
}
