import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";
import { useProfile, useUpdateProfile } from "../personal.api";

const PLACEHOLDER =
  "Ex: compro por impulso quando estou estressado, gasto mais nos fins de semana, " +
  "estou juntando pra uma viagem em dezembro, evito delivery durante a semana...";

export function GatilhosTab() {
  const { data: triggers, isLoading } = useProfile();
  const update = useUpdateProfile();
  const [text, setText] = useState("");

  // carrega o texto salvo quando chega do servidor
  useEffect(() => {
    if (triggers !== undefined) setText(triggers);
  }, [triggers]);

  const dirty = text !== (triggers ?? "");

  function handleSave() {
    if (!dirty || update.isPending) return;
    update.mutate(text.trim());
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <BrainCircuit className="h-4 w-4 text-brand" />
          Conte seus gatilhos pra Mira
        </p>
        <p className="mt-1 text-sm font-light text-muted">
          Descreva seus padrões de consumo, objetivos e o contexto do momento. A Mira usa isso —
          junto com o que ela aprende das suas compras — pra te aconselhar melhor.
        </p>
      </div>

      <Card className="p-5">
        {isLoading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={6}
              maxLength={2000}
              className={cn(
                "w-full resize-y rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm leading-relaxed text-heading",
                "placeholder:text-faint outline-none transition",
                "focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
              )}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-faint">{text.length}/2000</span>
              <Button onPress={handleSave} isPending={update.isPending} isDisabled={!dirty || update.isPending}>
                {update.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            {update.error && <p className="mt-2 text-sm text-negative">{update.error.message}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
