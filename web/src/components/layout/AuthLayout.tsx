import type { ReactNode } from "react";
import { Circle, ScanLine, Sparkles } from "lucide-react";
import { Logo } from "../Logo";
import { Card } from "../ui/Card";

const features = [
  { icon: Circle, title: "Visão completa", desc: "Todos os seus números em um só lugar." },
  { icon: ScanLine, title: "Automação inteligente", desc: "Conciliação e categorias sem esforço." },
  { icon: Sparkles, title: "Decisões melhores", desc: "Insights em tempo real pro seu dia." },
];

// painel esquerdo de marketing compartilhado entre login e signup (bate com o 3o print)
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        {/* brilho verde no rodape, como no mockup */}
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

        <Logo />

        <div className="relative max-w-md">
          <h1 className="text-5xl font-light leading-[1.05] tracking-tighter">
            Suas finanças,
            <br />
            finalmente <span className="text-brand">em foco.</span>
          </h1>
          <p className="mt-5 text-lg font-light text-muted">
            Clareza, controle e automação pra você tomar decisões melhores todos os dias.
          </p>

          <div className="mt-10 flex gap-6">
            <Card className="flex-1 p-5">
              <p className="text-xs text-muted">Saldo total</p>
              <p className="tnum mt-2 text-2xl font-light text-heading">R$ 128.540,75</p>
              <p className="tnum mt-1 text-xs text-positive">↑ 8,45% vs mês anterior</p>
            </Card>
            <Card className="flex-1 p-5">
              <p className="text-xs text-muted">Receitas</p>
              <p className="tnum mt-2 text-2xl font-light text-heading">R$ 76.430,00</p>
              <p className="tnum mt-1 text-xs text-positive">↑ 12,6%</p>
            </Card>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border">
                <Icon className="h-4 w-4 text-brand" />
              </span>
              <p className="text-sm text-heading">{title}</p>
              <p className="text-xs text-faint">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
