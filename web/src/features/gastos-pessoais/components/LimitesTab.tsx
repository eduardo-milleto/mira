import { useState } from "react";
import { Pencil, Sparkles, Target, Trash2 } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { formatBRL, formatPct } from "../../../lib/format";
import { LimitFormModal } from "./LimitFormModal";
import {
  useDeleteLimit,
  useLimits,
  usePersonalSummary,
  useSuggestLimits,
  useUpsertLimit,
  type CategoryLimit,
  type LimitSuggestion,
} from "../personal.api";

// barra de progresso do gasto vs limite: verde dentro, vermelho quando estoura
function LimitRow({
  limit,
  spent,
  onEdit,
  onDelete,
}: {
  limit: CategoryLimit;
  spent: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
  const over = spent > limit.amount;

  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline gap-3 text-sm">
        <span className="min-w-0 flex-1 truncate text-heading">
          {limit.category}
          {limit.source === "ai" && (
            <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">IA</span>
          )}
        </span>
        <span className="tnum shrink-0 text-heading">
          {formatBRL(spent)} <span className="text-faint">/ {formatBRL(limit.amount)}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
            aria-label="Editar limite"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-negative"
            aria-label="Remover limite"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={over ? "h-full rounded-full bg-negative" : "h-full rounded-full bg-brand-gradient"}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className={`tnum shrink-0 text-xs ${over ? "text-negative" : "text-muted"}`}>
          {over ? "estourou" : formatPct(pct)}
        </span>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  applying,
}: {
  suggestion: LimitSuggestion;
  onApply: () => void;
  applying: boolean;
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-heading">{suggestion.category}</p>
        <span className="tnum shrink-0 text-sm text-brand">{formatBRL(suggestion.amount)}/mês</span>
      </div>
      <p className="mt-1 text-xs font-light leading-relaxed text-muted">{suggestion.reason}</p>
      <Button variant="outline" className="mt-3 px-3 py-2 text-xs" onPress={onApply} isPending={applying}>
        Aplicar limite
      </Button>
    </li>
  );
}

export function LimitesTab() {
  const { data: limits, isLoading } = useLimits();
  const { data: summary } = usePersonalSummary();
  const upsert = useUpsertLimit();
  const remove = useDeleteLimit();
  const suggest = useSuggestLimits();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryLimit | undefined>();
  const [toDelete, setToDelete] = useState<CategoryLimit | undefined>();

  const spentOf = (category: string) =>
    summary?.byCategory.find((c) => c.category === category)?.spent ?? 0;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function applySuggestion(s: LimitSuggestion) {
    upsert.mutate({ category: s.category, amount: s.amount });
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.category, { onSuccess: () => setToDelete(undefined) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Tetos mensais por categoria — a Mira avisa quando aperta</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="px-4 py-2.5"
            onPress={() => suggest.mutate()}
            isPending={suggest.isPending}
          >
            <Sparkles className="h-4 w-4" />
            Sugerir com IA
          </Button>
          <Button onPress={openCreate} className="px-4 py-2.5">
            Definir limite
          </Button>
        </div>
      </div>

      {suggest.isError && (
        <p className="text-sm text-negative">{suggest.error.message}</p>
      )}

      {suggest.data && suggest.data.suggestions.length > 0 && (
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sparkles className="h-4 w-4 text-brand" />
            Sugestões da Mira
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {suggest.data.suggestions.map((s) => (
              <SuggestionCard
                key={s.category}
                suggestion={s}
                onApply={() => applySuggestion(s)}
                applying={upsert.isPending}
              />
            ))}
          </ul>
        </Card>
      )}

      <Card className="divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : !limits?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Target className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Nenhum limite definido ainda.</p>
            <p className="text-xs text-faint">Defina um teto ou peça sugestões para a Mira.</p>
          </div>
        ) : (
          limits.map((limit) => (
            <LimitRow
              key={limit.id}
              limit={limit}
              spent={spentOf(limit.category)}
              onEdit={() => {
                setEditing(limit);
                setFormOpen(true);
              }}
              onDelete={() => setToDelete(limit)}
            />
          ))
        )}
      </Card>

      <LimitFormModal isOpen={formOpen} onOpenChange={setFormOpen} limit={editing} />
      <ConfirmDialog
        isOpen={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(undefined)}
        title="Remover limite"
        description={`Remover o limite de "${toDelete?.category}"?`}
        confirmLabel="Remover"
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
