import { createRoute, Outlet } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";
import { requireAuth } from "@/lib/auth-loader";
import { AuthenticatedLayout } from "@/layouts/authenticated-layout";

export const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_public",
  component: () => <Outlet />,
});

export const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  loader: () => requireAuth(),
  staleTime: Infinity,
  component: AuthenticatedLayout,
});
