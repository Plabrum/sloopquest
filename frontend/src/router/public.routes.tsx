import { createRoute } from "@tanstack/react-router";
import { publicLayoutRoute } from "@/router/layout.routes";
import { redirectIfAuthenticated } from "@/lib/auth-loader";
import { AuthPage } from "@/pages/auth-page";
import { MagicLinkVerifyPage } from "@/pages/magic-link-verify-page";
import { GalleryPage } from "@/pages/gallery-page";

export const authRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/auth",
  validateSearch: (
    search: Record<string, unknown>,
  ): { reason?: "session-expired" } =>
    search["reason"] === "session-expired"
      ? { reason: "session-expired" }
      : {},
  loader: () => redirectIfAuthenticated(),
  component: AuthPage,
});

export const magicLinkVerifyRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/auth/magic-link/verify",
  validateSearch: (search: Record<string, unknown>) => ({
    token: String(search["token"] ?? ""),
  }),
  component: MagicLinkVerifyPage,
});

export const galleryRoute = import.meta.env.DEV
  ? createRoute({
      getParentRoute: () => publicLayoutRoute,
      path: "/gallery",
      component: GalleryPage,
    })
  : null;
