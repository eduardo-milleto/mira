import { Brain, ChevronRight, Rocket, Sparkles } from "lucide-react";

export function MiraInsight() {
  return (
    <div className="relative overflow-hidden">
      {/* grafico de IA decorativo no canto */}
      <Brain className="pointer-events-none absolute -right-2 top-1/2 h-28 w-28 -translate-y-1/2 text-brand/10" />

      <p className="relative flex items-center gap-2 text-sm text-muted">
        <Sparkles className="h-4 w-4 text-brand" />
        Insight da Mira
      </p>
      <h3 className="relative mt-3 flex items-center gap-2 text-xl font-light tracking-tighter">
        Seu ritmo de ganhos está acima da média!
        <Rocket className="h-5 w-5 text-brand" />
      </h3>
      <p className="relative mt-2 max-w-md text-sm font-light text-muted">
        Você aumentou seus ganhos em 28,6% este mês. Mantenha o foco nas suas principais fontes e
        considere escalar os projetos que já estão trazendo excelentes resultados.
      </p>
      <button
        type="button"
        className="relative mt-4 inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm text-brand transition hover:bg-brand/20"
      >
        Ver sugestões personalizadas
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
