import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { Logo } from "../Logo";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useLogout, useSession } from "../../features/auth/auth.api";

export function AppShell() {
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => navigate({ to: "/login" }) });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col gap-8 border-r border-border p-6 md:flex">
        <Logo />
        <nav className="flex flex-col gap-1">
          <span className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-heading">
            <LayoutDashboard className="h-4 w-4 text-brand" />
            Visão geral
          </span>
          <span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-faint">
            <Wallet className="h-4 w-4" />
            Contas
          </span>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-8 py-4">
          <div>
            <p className="text-sm text-muted">Bem-vindo de volta</p>
            <p className="text-heading">{user?.name}</p>
          </div>
          <Button variant="ghost" onPress={handleLogout} isPending={logout.isPending}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-md p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border">
              <LayoutDashboard className="h-5 w-5 text-brand" />
            </span>
            <h2 className="mt-5 text-2xl font-light tracking-tighter">Dashboard em breve</h2>
            <p className="mt-2 text-sm text-muted">
              A autenticação está pronta. O painel com contas, transações e relatórios chega na
              próxima etapa.
            </p>
          </Card>
        </main>
      </div>
    </div>
  );
}
