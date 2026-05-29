import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Button as AriaButton,
} from "react-aria-components";
import {
  ArrowDownUp,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronsUpDown,
  Home,
  Landmark,
  LogOut,
  Sparkles,
  Target,
  Vault,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "../Logo";
import { useLogout, useSession } from "../../features/auth/auth.api";
import { useCofre } from "../../features/cofre/cofre.api";
import { CofreMonthCloseModal } from "../../features/cofre/CofreMonthCloseModal";
import { HeaderCoinPill } from "../../features/cofre/HeaderCoinPill";

type NavItem = { icon: LucideIcon; label: string; to?: string; exact?: boolean };

// itens com `to` navegam; os demais ainda nao tem pagina (placeholder)
const navItems: NavItem[] = [
  { icon: Home, label: "Visão geral", to: "/", exact: true },
  { icon: CalendarDays, label: "Ganhos mensais", to: "/ganhos" },
  { icon: Wallet, label: "Gastos mensais", to: "/gastos" },
  { icon: ArrowDownUp, label: "Extras", to: "/extras" },
  { icon: BarChart3, label: "Projeções", to: "/projecoes" },
  { icon: Sparkles, label: "Sugestões IA", to: "/sugestoes" },
  { icon: Target, label: "Investimentos", to: "/investimentos" },
  { icon: Landmark, label: "Patrimônio", to: "/patrimonio" },
  { icon: Vault, label: "Cofre", to: "/cofre" },
];

const navBase = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition";
const navInactive = "text-muted hover:bg-white/5 hover:text-heading";
const navActive = "border border-brand/30 bg-brand-soft text-heading";

export function DashboardLayout() {
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();
  // fechamentos de mes pendentes: enquanto houver, o modal bloqueante cobre o app inteiro
  const { data: cofre } = useCofre(!!user);

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => navigate({ to: "/login" }) });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col justify-between border-r border-border p-5 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="px-2">
            <Logo />
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ icon: Icon, label, to, exact }) =>
              to ? (
                <Link
                  key={label}
                  to={to}
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
          <AriaButton className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left outline-none transition hover:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand/40">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-black">
              {(user?.name ?? "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-heading">{user?.name}</span>
              <span className="block text-xs text-faint">Plano Premium</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 text-faint" />
          </AriaButton>
          <Popover className="w-[var(--trigger-width)] rounded-xl border border-border bg-surface-2 p-1 shadow-card outline-none">
            <Menu className="outline-none" onAction={handleLogout}>
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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border px-6 py-4">
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

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {cofre && cofre.pendingMonths.length > 0 && (
        <CofreMonthCloseModal pendingMonths={cofre.pendingMonths} />
      )}
    </div>
  );
}
