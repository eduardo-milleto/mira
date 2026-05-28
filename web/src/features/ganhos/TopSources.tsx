import { formatBRL, formatPct } from "../../lib/format";
import { topSources } from "./data";

export function TopSources() {
  return (
    <ul className="space-y-4">
      {topSources.map((source, i) => {
        const Icon = source.icon;
        return (
          <li key={source.name} className="flex items-center gap-3 text-sm">
            <span className="tnum w-4 text-center text-faint">{i + 1}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-heading">{source.name}</span>
            <span className="tnum text-heading">{formatBRL(source.value)}</span>
            <span className="tnum w-12 text-right text-positive">{formatPct(source.percent)}</span>
          </li>
        );
      })}
    </ul>
  );
}
