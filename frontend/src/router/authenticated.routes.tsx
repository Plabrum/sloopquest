import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { authenticatedLayoutRoute } from "@/router/layout.routes";
import { queryClient } from "@/lib/query-client";
import { DashboardPage } from "@/pages/dashboard-page";
import { InboxPage } from "@/pages/inbox/inbox-page";
import { SurveysListPage } from "@/pages/surveys/surveys-list-page";
import { SurveyDetailPage } from "@/pages/surveys/survey-detail-page";
import { VesselsListPage } from "@/pages/vessels/vessels-list-page";
import { VesselDetailPage } from "@/pages/vessels/vessel-detail-page";
import { ClientsListPage } from "@/pages/clients/clients-list-page";
import { ClientDetailPage } from "@/pages/clients/client-detail-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { ReportDetailPage } from "@/pages/reports/report-detail-page";
import { InvoicesListPage } from "@/pages/invoices/invoices-list-page";
import { InvoiceDetailPage } from "@/pages/invoices/invoice-detail-page";
import { SubscriptionsPage } from "@/pages/subscriptions/subscriptions-page";
import { SurveyTemplateDetailPage } from "@/pages/survey-templates/survey-template-detail-page";
import { SearchPage } from "@/pages/search/search-page";
import { SettingsShell } from "@/pages/settings/settings-page";
import { AccountPage } from "@/pages/settings/account-page";
import { AppearancePage } from "@/pages/settings/appearance-page";
import { NotificationsPage } from "@/pages/settings/notifications-page";
import { TemplatesListPage } from "@/pages/settings/templates/templates-list-page";
import { PricingGuidesListPage } from "@/pages/settings/pricing-guides/pricing-guides-list-page";
import { BillingPage } from "@/pages/settings/billing-page";
import { ConnectOnboardingPage } from "@/pages/settings/connect-onboarding-page";
import { QuotesListPage } from "@/pages/crm/quotes-list-page";
import { PricingGuideDetailPage } from "@/pages/pricing-guides/pricing-guide-detail-page";
import { getPricingGuidesIdDetailHandlerSuspenseQueryOptions } from "@/openapi/pricing-guides/pricing-guides";
import { getSurveyTemplatesIdDetailHandlerSuspenseQueryOptions } from "@/openapi/survey-templates/survey-templates";
import type {
  PricingGuideDetail,
  SurveyTemplateDetail,
} from "@/openapi/litestarAPI.schemas";
import { isCalendarView } from "@/components/calendar/types";
import "@/router/types";

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  staticData: { crumb: "Dashboard" },
  component: DashboardPage,
});

export const searchRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/search",
  staticData: { crumb: "Search" },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    tab: typeof search.tab === "string" ? search.tab : "global",
  }),
  component: SearchPage,
});

export type InboxView = "all" | "unread" | "sent" | "archived";
export type InboxMode = "mail" | "calendar";

export interface InboxSearch {
  mode?: InboxMode;
  view?: InboxView;
  thread?: string;
  calendarView?: "month" | "week" | "day";
  date?: string;
  event?: string;
  creating?: boolean;
}

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/inbox",
  staticData: { crumb: "Inbox" },
  validateSearch: (search: Record<string, unknown>): InboxSearch => {
    const rawView = search.view;
    const view: InboxView | undefined =
      rawView === "unread" || rawView === "sent" || rawView === "archived" || rawView === "all"
        ? rawView
        : undefined;
    const mode: InboxMode | undefined = search.mode === "calendar" ? "calendar" : undefined;
    return {
      mode,
      view,
      thread: typeof search.thread === "string" ? search.thread : undefined,
      calendarView: isCalendarView(search.calendarView) ? search.calendarView : undefined,
      date: typeof search.date === "string" ? search.date : undefined,
      event: typeof search.event === "string" ? search.event : undefined,
      creating: search.creating === true ? true : undefined,
    };
  },
  component: InboxPage,
});

export const clientsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/clients",
  staticData: { crumb: "Clients" },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: ClientsListPage,
});

export const vesselsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/vessels",
  staticData: { crumb: "Vessels" },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: VesselsListPage,
});

export const quotesListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/quotes",
  staticData: { crumb: "Quotes" },
  component: QuotesListPage,
});

export const clientRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/clients/$clientId",
  params: {
    parse: (p) => ({ clientId: p.clientId }),
    stringify: (p) => ({ clientId: p.clientId }),
  },
  staticData: {
    threadable: { type: "client", paramKey: "clientId" },
    crumb: "Client",
  },
  component: ClientDetailPage,
});

export const vesselRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/vessels/$vesselId",
  params: {
    parse: (p) => ({ vesselId: p.vesselId }),
    stringify: (p) => ({ vesselId: p.vesselId }),
  },
  staticData: {
    threadable: { type: "vessel", paramKey: "vesselId" },
    crumb: "Vessel",
  },
  component: VesselDetailPage,
});

export const surveysListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/surveys",
  staticData: { crumb: "Surveys" },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: SurveysListPage,
});

export const surveyRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/surveys/$surveyId",
  params: {
    parse: (p) => ({ surveyId: p.surveyId }),
    stringify: (p) => ({ surveyId: p.surveyId }),
  },
  staticData: {
    threadable: { type: "survey", paramKey: "surveyId" },
    crumb: "Survey",
  },
  component: SurveyDetailPage,
});

export const reportsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/reports",
  staticData: { crumb: "Reports" },
  component: ReportsPage,
});

export const reportRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/reports/$reportId",
  params: {
    parse: (p) => ({ reportId: p.reportId }),
    stringify: (p) => ({ reportId: p.reportId }),
  },
  staticData: {
    threadable: { type: "report", paramKey: "reportId" },
    crumb: "Report",
  },
  component: ReportDetailPage,
});

export const invoicesListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/money/invoices",
  staticData: { crumb: "Invoices" },
  component: InvoicesListPage,
});

export const subscriptionsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/money/subscriptions",
  staticData: { crumb: "Subscriptions" },
  component: SubscriptionsPage,
});

export const invoiceRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/invoices/$invoiceId",
  params: {
    parse: (p) => ({ invoiceId: p.invoiceId }),
    stringify: (p) => ({ invoiceId: p.invoiceId }),
  },
  staticData: {
    threadable: { type: "invoice", paramKey: "invoiceId" },
    crumb: "Invoice",
  },
  component: InvoiceDetailPage,
});

export const calendarRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/calendar",
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?: "month" | "week" | "day";
    date?: string;
    event?: string;
    creating?: boolean;
  } => ({
    view: isCalendarView(search.view) ? search.view : undefined,
    date: typeof search.date === "string" ? search.date : undefined,
    event: typeof search.event === "string" ? search.event : undefined,
    creating: search.creating === true ? true : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/inbox",
      search: {
        mode: "calendar",
        calendarView: search.view,
        date: search.date,
        event: search.event,
        creating: search.creating,
      },
    });
  },
  component: () => null,
});

export const settingsLayoutRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/settings",
  staticData: { crumb: "Settings" },
  component: SettingsShell,
});

export const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/settings/account" });
  },
  component: () => null,
});

export const accountRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "account",
  staticData: { crumb: "Account" },
  component: AccountPage,
});

export const appearanceRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "appearance",
  staticData: { crumb: "Appearance" },
  component: AppearancePage,
});

export const notificationsRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "notifications",
  staticData: { crumb: "Notifications" },
  component: NotificationsPage,
});

export const billingRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "billing",
  staticData: { crumb: "Billing" },
  validateSearch: (
    search: Record<string, unknown>,
  ): { onboarding?: "complete" | "refresh" } => {
    const value = search["onboarding"];
    return value === "complete" || value === "refresh"
      ? { onboarding: value }
      : {};
  },
  component: BillingPage,
});

export const connectOnboardingRoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "connect/onboarding",
  staticData: { crumb: "Stripe onboarding" },
  component: ConnectOnboardingPage,
});

export const templatesListRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "templates",
  staticData: { crumb: "Templates" },
  component: () => <Outlet />,
});

export const templatesIndexRoute = createRoute({
  getParentRoute: () => templatesListRoute,
  path: "/",
  component: TemplatesListPage,
});

export const templateDetailRoute = createRoute({
  getParentRoute: () => templatesListRoute,
  path: "$templateId",
  params: {
    parse: (p) => ({ templateId: p.templateId }),
    stringify: (p) => ({ templateId: p.templateId }),
  },
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      getSurveyTemplatesIdDetailHandlerSuspenseQueryOptions(params.templateId),
    ),
  staticData: {
    threadable: { type: "survey_template", paramKey: "templateId" },
    crumb: (m) =>
      (m.loaderData as SurveyTemplateDetail | undefined)?.name ??
      "Survey template",
  },
  component: SurveyTemplateDetailPage,
});

export const pricingGuidesListRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "pricing-guides",
  staticData: { crumb: "Pricing Guides" },
  component: () => <Outlet />,
});

export const pricingGuidesIndexRoute = createRoute({
  getParentRoute: () => pricingGuidesListRoute,
  path: "/",
  component: PricingGuidesListPage,
});

export const pricingGuideDetailRoute = createRoute({
  getParentRoute: () => pricingGuidesListRoute,
  path: "$guideId",
  params: {
    parse: (p) => ({ guideId: p.guideId }),
    stringify: (p) => ({ guideId: p.guideId }),
  },
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      getPricingGuidesIdDetailHandlerSuspenseQueryOptions(params.guideId),
    ),
  staticData: {
    crumb: (m) =>
      (m.loaderData as PricingGuideDetail | undefined)?.name ??
      "Pricing guide",
  },
  component: PricingGuideDetailPage,
});

const pricingGuideRedirectRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/pricing-guides/$guideId",
  params: {
    parse: (p) => ({ guideId: p.guideId }),
    stringify: (p) => ({ guideId: p.guideId }),
  },
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/settings/pricing-guides/$guideId",
      params: { guideId: params.guideId },
    });
  },
  component: () => null,
});

const surveyTemplatesListRedirectRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/survey-templates",
  beforeLoad: () => {
    throw redirect({ to: "/settings/templates" });
  },
  component: () => null,
});

const surveyTemplateDetailRedirectRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/survey-templates/$templateId",
  params: {
    parse: (p) => ({ templateId: p.templateId }),
    stringify: (p) => ({ templateId: p.templateId }),
  },
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/settings/templates/$templateId",
      params: { templateId: params.templateId },
    });
  },
  component: () => null,
});

export const legacyRedirectRoutes = [
  pricingGuideRedirectRoute,
  surveyTemplatesListRedirectRoute,
  surveyTemplateDetailRedirectRoute,
];
