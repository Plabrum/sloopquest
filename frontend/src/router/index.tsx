import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";
import {
  publicLayoutRoute,
  authenticatedLayoutRoute,
} from "@/router/layout.routes";
import { authRoute, magicLinkVerifyRoute, galleryRoute } from "@/router/public.routes";
import { payInvoiceRoute } from "@/router/payment.routes";
import {
  indexRoute,
  searchRoute,
  inboxRoute,
  clientsListRoute,
  vesselsListRoute,
  quotesListRoute,
  clientRoute,
  vesselRoute,
  surveysListRoute,
  surveyRoute,
  invoicesListRoute,
  subscriptionsRoute,
  invoiceRoute,
  reportsRoute,
  reportRoute,
  calendarRoute,
  settingsLayoutRoute,
  settingsIndexRoute,
  accountRoute,
  appearanceRoute,
  notificationsRoute,
  billingRoute,
  connectOnboardingRoute,
  templatesListRoute,
  templatesIndexRoute,
  templateDetailRoute,
  pricingGuidesListRoute,
  pricingGuidesIndexRoute,
  pricingGuideDetailRoute,
  legacyRedirectRoutes,
} from "@/router/authenticated.routes";

const devRoutes = galleryRoute ? [galleryRoute] : [];

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([authRoute, magicLinkVerifyRoute, payInvoiceRoute, ...devRoutes]),
  authenticatedLayoutRoute.addChildren([
    indexRoute,
    searchRoute,
    inboxRoute,
    clientsListRoute,
    vesselsListRoute,
    quotesListRoute,
    clientRoute,
    vesselRoute,
    surveysListRoute,
    surveyRoute,
    invoicesListRoute,
    subscriptionsRoute,
    invoiceRoute,
    reportsRoute,
    reportRoute,
    calendarRoute,
    settingsLayoutRoute.addChildren([
      settingsIndexRoute,
      accountRoute,
      appearanceRoute,
      notificationsRoute,
      billingRoute.addChildren([connectOnboardingRoute]),
      templatesListRoute.addChildren([templatesIndexRoute, templateDetailRoute]),
      pricingGuidesListRoute.addChildren([pricingGuidesIndexRoute, pricingGuideDetailRoute]),
    ]),
    ...legacyRedirectRoutes,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
