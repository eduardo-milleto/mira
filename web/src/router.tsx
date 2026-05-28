import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { sessionQueryOptions } from "./features/auth/auth.api";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { OverviewPage } from "./features/overview/OverviewPage";
import { GanhosPage } from "./features/ganhos/GanhosPage";

type RouterContext = { queryClient: QueryClient };

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

// quem ja esta logado nao precisa ver login/signup
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (user) throw redirect({ to: "/" });
  },
  component: SignupPage,
});

// layout autenticado: sem sessao manda pro login; renderiza o shell + <Outlet/>
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!user) throw redirect({ to: "/login" });
  },
  component: DashboardLayout,
});

const overviewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  component: OverviewPage,
});

const ganhosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/ganhos",
  component: GanhosPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  signupRoute,
  appLayoutRoute.addChildren([overviewRoute, ganhosRoute]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient: undefined as unknown as QueryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
