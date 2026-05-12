import { createRoute } from "@tanstack/react-router";
import { publicLayoutRoute } from "@/router/layout.routes";
import { PayInvoicePage } from "@/pages/pay/pay-invoice-page";

export const payInvoiceRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/pay/$accessToken",
  component: PayInvoicePage,
});
