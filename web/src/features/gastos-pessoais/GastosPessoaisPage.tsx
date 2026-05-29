import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { ComprasTab } from "./components/ComprasTab";
import { LimitesTab } from "./components/LimitesTab";
import { AdvisorChat } from "./components/AdvisorChat";
import { GatilhosTab } from "./components/GatilhosTab";

const tabBase =
  "cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40";
const tabInactive = "text-muted data-[hovered]:text-heading";
const tabSelected = "bg-surface-2 text-heading shadow-card";

function tabClass({ isSelected }: { isSelected: boolean }) {
  return `${tabBase} ${isSelected ? tabSelected : tabInactive}`;
}

export function GastosPessoaisPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Gastos Pessoais</h1>
        <p className="mt-1 text-sm text-muted">
          Seus gastos do dia a dia com a Mira de olho — defina limites e pergunte antes de comprar.
        </p>
      </div>

      <Tabs>
        <TabList
          aria-label="Seções de gastos pessoais"
          className="inline-flex gap-1 rounded-xl border border-border bg-surface/60 p-1"
        >
          <Tab id="compras" className={tabClass}>
            Compras
          </Tab>
          <Tab id="limites" className={tabClass}>
            Limites
          </Tab>
          <Tab id="consultora" className={tabClass}>
            Consultora IA
          </Tab>
          <Tab id="gatilhos" className={tabClass}>
            Gatilhos
          </Tab>
        </TabList>

        <TabPanel id="compras" className="mt-6 outline-none">
          <ComprasTab />
        </TabPanel>
        <TabPanel id="limites" className="mt-6 outline-none">
          <LimitesTab />
        </TabPanel>
        <TabPanel id="consultora" className="mt-6 outline-none">
          <AdvisorChat />
        </TabPanel>
        <TabPanel id="gatilhos" className="mt-6 outline-none">
          <GatilhosTab />
        </TabPanel>
      </Tabs>
    </div>
  );
}
