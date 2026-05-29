import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { ExpensesTab } from "./ExpensesTab";
import { CardsTab } from "./CardsTab";

const tabBase =
  "cursor-pointer rounded-lg px-4 py-2 text-sm outline-none transition data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40";
const tabInactive = "text-muted data-[hovered]:text-heading";
const tabSelected = "bg-surface-2 text-heading shadow-card";

export function GastosPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Gastos</h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie seus gastos mensais e seus cartoes de credito.
        </p>
      </div>

      <Tabs>
        <TabList
          aria-label="Secoes de gastos"
          className="inline-flex gap-1 rounded-xl border border-border bg-surface/60 p-1"
        >
          <Tab id="gastos" className={({ isSelected }) => `${tabBase} ${isSelected ? tabSelected : tabInactive}`}>
            Gastos
          </Tab>
          <Tab id="cartoes" className={({ isSelected }) => `${tabBase} ${isSelected ? tabSelected : tabInactive}`}>
            Cartoes de credito
          </Tab>
        </TabList>

        <TabPanel id="gastos" className="mt-6 outline-none">
          <ExpensesTab />
        </TabPanel>
        <TabPanel id="cartoes" className="mt-6 outline-none">
          <CardsTab />
        </TabPanel>
      </Tabs>
    </div>
  );
}
