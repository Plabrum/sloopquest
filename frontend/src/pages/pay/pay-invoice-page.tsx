import { Suspense, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { customInstance } from "@/openapi/custom-instance";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";

type PublicInvoiceLineItem = {
  description: string;
  quantity: string;
  unit_price_cents: number;
};

type PublicInvoiceDetail = {
  id: string;
  state: "draft" | "sent" | "paid" | "void" | "refunded";
  identifier: string | null;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  issued_at: string | null;
  due_at: string | null;
  organization_name: string;
  stripe_connected_account_id: string | null;
  stripe_client_secret: string | null;
  line_items: PublicInvoiceLineItem[];
};

function publicInvoiceQuery(accessToken: string) {
  return {
    queryKey: ["public-invoice", accessToken] as const,
    queryFn: () =>
      customInstance<PublicInvoiceDetail>({
        url: `/public/invoices/${accessToken}`,
        method: "GET",
      }),
  };
}

function InvoiceSummary({ invoice }: { invoice: PublicInvoiceDetail }) {
  return (
    <div className="rounded-xl border bg-card p-6 mb-6">
      <h1 className="text-xl font-semibold mb-1">
        Invoice {invoice.identifier ?? ""}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        from {invoice.organization_name}
      </p>
      <div className="space-y-2 mb-4">
        {invoice.line_items.map((li, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>
              {li.description}{" "}
              <span className="text-muted-foreground">× {li.quantity}</span>
            </span>
            <span>{formatCents(li.unit_price_cents * Number(li.quantity))}</span>
          </div>
        ))}
      </div>
      <div className="border-t pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCents(invoice.subtotal_cents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax</span>
          <span>{formatCents(invoice.tax_cents)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-2 border-t">
          <span>Total</span>
          <span>{formatCents(invoice.total_cents)}</span>
        </div>
      </div>
    </div>
  );
}

function PayForm({ accessToken }: { accessToken: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${accessToken}`,
      },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? "Processing…" : "Pay invoice"}
      </Button>
    </form>
  );
}

function PayInvoiceContent() {
  const { accessToken } = useParams({ from: "/_public/pay/$accessToken" });
  const { data: invoice } = useSuspenseQuery(publicInvoiceQuery(accessToken));

  if (invoice.state === "paid" || invoice.state === "refunded") {
    return (
      <div className="max-w-lg mx-auto p-6">
        <InvoiceSummary invoice={invoice} />
        <div className="rounded-xl border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            {invoice.state === "paid" ? "Paid" : "Refunded"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {invoice.state === "paid"
              ? "Thank you for your payment."
              : "This invoice has been refunded."}
          </p>
        </div>
      </div>
    );
  }

  if (invoice.state === "draft") {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            This invoice isn't ready yet
          </h2>
          <p className="text-sm text-muted-foreground">
            {invoice.organization_name} hasn't finalized this invoice. Check back
            once they've sent it.
          </p>
        </div>
      </div>
    );
  }

  if (invoice.state === "void") {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            This invoice is no longer available
          </h2>
          <p className="text-sm text-muted-foreground">
            Please contact {invoice.organization_name} for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!invoice.stripe_client_secret) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <InvoiceSummary invoice={invoice} />
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Payment isn't set up for this invoice. Please contact{" "}
            {invoice.organization_name}.
          </p>
        </div>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: invoice.stripe_client_secret,
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <InvoiceSummary invoice={invoice} />
      <div className="rounded-xl border bg-card p-6">
        <Elements stripe={getStripe()} options={options}>
          <PayForm accessToken={accessToken} />
        </Elements>
      </div>
    </div>
  );
}

export function PayInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto p-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PayInvoiceContent />
    </Suspense>
  );
}
