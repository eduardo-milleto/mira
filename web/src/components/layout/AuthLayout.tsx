import type { ReactNode } from "react";
import { Logo } from "../Logo";

// tela unica: imagem cobre o fundo inteiro, logo no topo e o form flutuando por cima.
// usada por login e signup.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* imagem de fundo cobrindo tudo + overlay pra manter texto/form legiveis */}
      <img
        src="/login-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-bg/55" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-bg via-bg/30 to-transparent" />

      <div className="relative z-10 p-8 lg:p-12">
        <Logo />
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-7rem)] items-center gap-10 px-8 pb-12 lg:grid-cols-2 lg:px-12">
        <div className="hidden max-w-lg lg:block">
          <h1 className="text-5xl font-light leading-[1.05] tracking-tighter">
            Suas finanças,
            <br />
            finalmente <span className="text-brand">em foco.</span>
          </h1>
          <p className="mt-5 text-lg font-light text-muted">
            Clareza, controle e automação pra você tomar decisões melhores todos os dias.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md lg:ml-auto lg:mr-0">{children}</div>
      </div>
    </div>
  );
}
