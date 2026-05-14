import { createRoute } from "@tanstack/react-router";
import { authenticatedLayoutRoute } from "@/router/layout.routes";
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
import { SurveyTemplatesListPage } from "@/pages/survey-templates/survey-templates-list-page";
import { SurveyTemplateDetailPage } from "@/pages/survey-templates/survey-template-detail-page";
import { SearchPage } from "@/pages/search/search-page";
import { SettingsPage } from "@/pages/settings/settings-page";
import { BillingPage } from "@/pages/settings/billing-page";
import { ConnectOnboardingPage } from "@/pages/settings/connect-onboarding-page";
import { QuotesListPage } from "@/pages/crm/quotes-list-page";
import { PricingGuideDetailPage } from "@/pages/pricing-guides/pricing-guide-detail-page";
import { CalendarPage } from "@/pages/calendar/calendar-page";
import { isCalendarView } from "@/components/calendar/types";

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  component: DashboardPage,
});

export const searchRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/search",
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    tab: typeof search.tab === "string" ? search.tab : "global",
  }),
  component: SearchPage,
});

export type InboxView = "all" | "unread" | "sent" | "archived";

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/inbox",
  validateSearch: (search: Record<string, unknown>): { view?: InboxView; thread?: string } => {
    const rawView = search.view;
    const view: InboxView | undefined =
      rawView === "unread" || rawView === "sent" || rawView === "archived" || rawView === "all"
        ? rawView
        : undefined;
    const thread = typeof search.thread === "string" ? search.thread : undefined;
    return { view, thread };
  },
  component: InboxPage,
});

export const clientsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/clients",
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: ClientsListPage,
});

export const vesselsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/vessels",
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: VesselsListPage,
});

export const quotesListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/crm/quotes",
  component: QuotesListPage,
});

export const clientRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/clients/$clientId",
  params: {
    parse: (p) => ({ clientId: p.clientId }),
    stringify: (p) => ({ clientId: p.clientId }),
  },
  staticData: { threadable: { type: "client", paramKey: "clientId" } },
  component: ClientDetailPage,
});

export const vesselRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/vessels/$vesselId",
  params: {
    parse: (p) => ({ vesselId: p.vesselId }),
    stringify: (p) => ({ vesselId: p.vesselId }),
  },
  staticData: { threadable: { type: "vessel", paramKey: "vesselId" } },
  component: VesselDetailPage,
});

export const surveysListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/surveys",
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
  staticData: { threadable: { type: "survey", paramKey: "surveyId" } },
  component: SurveyDetailPage,
});

export const reportsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/reports",
  component: ReportsPage,
});

export const reportRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/reports/$reportId",
  params: {
    parse: (p) => ({ reportId: p.reportId }),
    stringify: (p) => ({ reportId: p.reportId }),
  },
  staticData: { threadable: { type: "report", paramKey: "reportId" } },
  component: ReportDetailPage,
});

export const invoicesListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/money/invoices",
  component: InvoicesListPage,
});

export const subscriptionsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/money/subscriptions",
  component: SubscriptionsPage,
});

export const invoiceRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/invoices/$invoiceId",
  params: {
    parse: (p) => ({ invoiceId: p.invoiceId }),
    stringify: (p) => ({ invoiceId: p.invoiceId }),
  },
  staticData: { threadable: { type: "invoice", paramKey: "invoiceId" } },
  component: InvoiceDetailPage,
});

export const surveyTemplatesListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/survey-templates",
  component: SurveyTemplatesListPage,
});

export const surveyTemplateRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/survey-templates/$templateId",
  params: {
    parse: (p) => ({ templateId: p.templateId }),
    stringify: (p) => ({ templateId: p.templateId }),
  },
  staticData: { threadable: { type: "survey_template", paramKey: "templateId" } },
  component: SurveyTemplateDetailPage,
});

export const pricingGuideRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/pricing-guides/$guideId",
  params: {
    parse: (p) => ({ guideId: p.guideId }),
    stringify: (p) => ({ guideId: p.guideId }),
  },
  component: PricingGuideDetailPage,
});

export const calendarRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/calendar",
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "month" | "week" | "day"; date?: string; event?: string } => ({
    view: isCalendarView(search.view) ? search.view : undefined,
    date: typeof search.date === "string" ? search.date : undefined,
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  component: CalendarPage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

export const billingRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/settings/billing",
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
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/settings/billing/connect/onboarding",
  component: ConnectOnboardingPage,
});
