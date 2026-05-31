import type { Verdict } from "./assistant.api";

// selo do parecer de compra (aparece so quando a pergunta foi sobre comprar/gastar).
// cores semanticas reservadas: verde = pode, ambar = cuidado, vermelho = evite.
const META: Record<Verdict, { label: string; className: string }> = {
  pode: { label: "Pode comprar", className: "bg-brand-soft text-brand" },
  cuidado: { label: "Cuidado", className: "bg-amber-500/10 text-amber-400" },
  evite: { label: "Melhor evitar", className: "bg-negative/10 text-negative" },
};

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const meta = META[verdict];
  return (
    <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}
