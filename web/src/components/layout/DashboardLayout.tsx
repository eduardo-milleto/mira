import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Button as AriaButton,
  Dialog,
  Modal as AriaModal,
  ModalOverlay,
} from "react-aria-components";
import {
  ArrowDownUp,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronsUpDown,
  Home,
  Landmark,
  LogOut,
  Menu as MenuIcon,
  Sparkles,
  Target,
  Vault,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "../Logo";
import { useLogout, useSession } from "../../features/auth/auth.api";
import { useCofre } from "../../features/cofre/cofre.api";
import { CofreMonthCloseModal } from "../../features/cofre/CofreMonthCloseModal";
import { HeaderCoinPill } from "../../features/cofre/HeaderCoinPill";
import { AssistantWidget } from "../../features/assistant/AssistantWidget";

type NavItem = { icon: LucideIcon; label: string; to?: string; exact?: boolean };

// itens com `to` navegam; os demais ainda nao tem pagina (placeholder)
const navItems: NavItem[] = [
  { icon: Home, label: "Visão Geral", to: "/", exact: true },
  { icon: CalendarDays, label: "Ganhos Mensais", to: "/ganhos" },
  { icon: Wallet, label: "Gastos Mensais", to: "/gastos" },
  { icon: ArrowDownUp, label: "Extras", to: "/extras" },
  { icon: BarChart3, label: "Projeções", to: "/projecoes" },
  { icon: Sparkles, label: "Sugestões IA", to: "/sugestoes" },
  { icon: Target, label: "Investimentos", to: "/investimentos" },
  { icon: Landmark, label: "Patrimônio", to: "/patrimonio" },
  { icon: Vault, label: "Cofre", to: "/cofre" },
  { icon: Building2, label: "Saldo No Banco", to: "/saldo-banco" },
];

const navBase = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition";
const navInactive = "text-muted hover:bg-white/5 hover:text-heading";
const navActive = "border border-brand/30 bg-brand-soft text-heading";

// conteudo da navegacao lateral: usado na sidebar fixa (desktop) e no drawer (mobile).
// onNavigate fecha o drawer quando o usuario escolhe uma pagina
function SidebarContent({
  userName,
  onLogout,
  onNavigate,
}: {
  userName?: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-col gap-8">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ icon: Icon, label, to, exact }) =>
            to ? (
              <Link
                key={label}
                to={to}
                onClick={onNavigate}
                activeOptions={{ exact: Boolean(exact) }}
                className={navBase}
                activeProps={{ className: navActive }}
                inactiveProps={{ className: navInactive }}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={isActive ? "h-4 w-4 text-brand" : "h-4 w-4"} />
                    {label}
                  </>
                )}
              </Link>
            ) : (
              <button key={label} type="button" className={`${navBase} ${navInactive}`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ),
          )}
        </nav>
      </div>

      <MenuTrigger>
        <AriaButton className="mt-6 flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left outline-none transition hover:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-black">
            {(userName ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-heading">{userName}</span>
            <span className="block text-xs text-faint">Plano Premium</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-faint" />
        </AriaButton>
        <Popover className="w-[var(--trigger-width)] rounded-xl border border-border bg-surface-2 p-1 shadow-card outline-none">
          <Menu className="outline-none" onAction={onLogout}>
            <MenuItem
              id="logout"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted outline-none data-[focused]:bg-white/5 data-[focused]:text-heading"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </>
  );
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();
  // fechamentos de mes pendentes: enquanto houver, o modal bloqueante cobre o app inteiro
  const { data: cofre } = useCofre(!!user);
  // drawer de navegacao no mobile (abaixo de lg a sidebar fica escondida)
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // garante o drawer fechado ao trocar de rota (ex.: links internos das paginas)
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => navigate({ to: "/login" }) });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-border p-5 lg:flex">
        <SidebarContent userName={user?.name} onLogout={handleLogout} />
      </aside>

      {/* drawer lateral no mobile/tablet: mesma navegacao da sidebar */}
      <ModalOverlay
        isOpen={navOpen}
        onOpenChange={setNavOpen}
        isDismissable
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
      >
        <AriaModal className="fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface outline-none">
          <Dialog
            aria-label="Menu de navegação"
            className="flex h-full flex-col justify-between overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] outline-none"
          >
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="absolute right-3 top-[max(1rem,env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-lg text-faint transition hover:bg-white/5 hover:text-heading"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              userName={user?.name}
              onLogout={handleLogout}
              onNavigate={() => setNavOpen(false)}
            />
          </Dialog>
        </AriaModal>
      </ModalOverlay>

      {/* min-w-0: sem isso o flex item cresce com o conteudo e a pagina rola na horizontal no mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 lg:static lg:bg-transparent lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-heading lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={navOpen}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to="/" className="lg:hidden" aria-label="Visão Geral">
            <Logo variant="mark" />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {cofre && <HeaderCoinPill balance={cofre.balance} />}
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-heading"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {cofre && cofre.pendingMonths.length > 0 && (
        <CofreMonthCloseModal pendingMonths={cofre.pendingMonths} />
      )}

      {/* assistente flutuante (canto inferior direito), presente em todas as paginas autenticadas */}
      {user && <AssistantWidget />}
    </div>
  );
}
