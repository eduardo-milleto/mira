import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ComboboxField } from "../../components/ui/Combobox";
import { useProjectionSettings, useUpdateProjectionSettings } from "./projecoes.api";

// horizontes comuns; allowsCustomValue do combobox deixa digitar outro valor
const HORIZON_OPTIONS = ["3", "5", "10", "15", "20"];

export function ProjectionSettingsCard() {
  const { data: settings } = useProjectionSettings();
  const update = useUpdateProjectionSettings();

  const [horizon, setHorizon] = useState("");

  // sincroniza com o que veio do banco assim que carrega
  useEffect(() => {
    if (settings) {
      setHorizon(String(settings.horizonYears));
    }
  }, [settings]);

  const horizonNum = Number.parseInt(horizon, 10);
  const horizonValid = Number.isInteger(horizonNum) && horizonNum >= 1 && horizonNum <= 30;
  const dirty = !!settings && horizonNum !== settings.horizonYears;

  function handleSave() {
    if (!horizonValid || update.isPending) return;
    update.mutate({ horizonYears: horizonNum });
  }

  return (
    <Card className="p-6">
      <p className="flex items-center gap-2 text-sm text-muted">
        <SlidersHorizontal className="h-4 w-4 text-brand" />
        Premissas da projeção
      </p>
      <p className="mt-1 text-xs text-faint">
        Defina por quantos anos a Mira projeta. A taxa de rendimento de cada ativo é definida no
        próprio investimento.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ComboboxField
          label="Horizonte (anos)"
          options={HORIZON_OPTIONS}
          value={horizon}
          onChange={setHorizon}
          placeholder="Anos"
        />
      </div>

      {update.error && <p className="mt-3 text-sm text-negative">{update.error.message}</p>}

      <div className="mt-5 flex justify-end">
        <Button
          onPress={handleSave}
          isPending={update.isPending}
          isDisabled={!dirty || !horizonValid || update.isPending}
          className="px-4 py-2.5"
        >
          {update.isPending ? "Salvando..." : "Salvar premissas"}
        </Button>
      </div>
    </Card>
  );
}
