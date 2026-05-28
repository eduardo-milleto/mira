import type { ReactNode } from "react";
import { Logo } from "../Logo";

// tela unica: imagem cobre o fundo, logo no topo e o form centralizado por cima.
// usada por login e signup.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* imagem de fundo cobrindo tudo + overlay pra manter o form legivel */}
      <img
        src="/login-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-bg/60" />

      <div className="relative z-10 p-8 lg:p-12">
        <Logo />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
