import { Suspense, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Landmark } from "lucide-react";
import { toast } from "sonner";

import { PageTopBar } from "@/components/layout/page-topbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConnectRequirements } from "@/components/connect-requirements";
import {
  useConnectRequirements,
  type ConnectAccountRequirements,
} from "@/lib/connect";
import { useListSubscriptionSuspense } from "@/openapi/subscription/subscription";
import type {
  SubscriptionListItem,
  SubscriptionStatus,
} from "@/openapi/litestarAPI.schemas";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  cancelled: "Cancelled",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function pickActiveSubscription(
  items: SubscriptionListItem[],
): SubscriptionListItem | null {
  if (items.length === 0) return null;
  const ranked = [...items].sort((a, b) => {
    const priority = (s: SubscriptionStatus) =>
      s === "active" || s === "trialing" ? 0 : s === "past_due" ? 1 : 2;
    const diff = priority(a.state) - priority(b.state);
    if (diff !== 0) return diff;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
  return ranked[0];
}

function SubscriptionSummary() {
  const { data } = useListSubscriptionSuspense(
    { limit: 50, offset: 0 },
    { query: { staleTime: 30_000 } },
  );
  const items = data.items;
  const subscription = pickActiveSubscription(items);

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            You do not have an active subscription.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const periodEnd = formatDate(subscription.current_period_end);
  const trialEnd = formatDate(subscription.trial_ends_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          Subscription
        </CardTitle>
        <CardDescription>
          {PLAN_LABELS[subscription.plan] ?? subscription.plan} plan
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Status</div>
          <div className="font-medium">
            {STATUS_LABELS[subscription.state] ?? subscription.state}
          </div>
        </div>
        {periodEnd && (
          <div>
            <div className="text-muted-foreground">
              {subscription.state === "cancelled"
                ? "Ends"
                : "Next billing"}
            </div>
            <div className="font-medium">{periodEnd}</div>
          </div>
        )}
        {trialEnd && (
          <div>
            <div className="text-muted-foreground">Trial ends</div>
            <div className="font-medium">{trialEnd}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoConnectAccountCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          Payouts
        </CardTitle>
        <CardDescription>
          Set up a Stripe Connect account to accept payments and receive
          payouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/settings/billing/connect/onboarding">Set up payouts</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectAccountCard({
  requirements,
}: {
  requirements: ConnectAccountRequirements;
}) {
  const isActive =
    requirements.charges_enabled && requirements.payouts_enabled;
  const hasActionRequired = requirements.currently_due.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? (
            <CheckCircle2 className="size-4 text-[var(--status-success)]" />
          ) : (
            <Landmark className="size-4 text-muted-foreground" />
          )}
          {isActive ? "Payouts active" : "Payouts — setup incomplete"}
        </CardTitle>
        <CardDescription>
          {isActive
            ? "Your account can accept charges and receive payouts."
            : "Finish onboarding to start accepting payments."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConnectRequirements requirements={requirements} />
        {hasActionRequired && (
          <Button asChild>
            <Link to="/settings/billing/connect/onboarding">
              Continue setup
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectStatusSection() {
  const { data: requirements } = useConnectRequirements();

  if (!requirements) {
    return <NoConnectAccountCard />;
  }

  return <ConnectAccountCard requirements={requirements} />;
}

export function BillingPage() {
  const search = useSearch({ from: "/_authenticated/settings/billing" });
  const navigate = useNavigate();

  useEffect(() => {
    if (!search.onboarding) return;
    if (search.onboarding === "complete") {
      toast.success("Onboarding complete. Refreshing your account…");
    } else if (search.onboarding === "refresh") {
      toast.message("Onboarding session expired. Please continue setup.");
    }
    navigate({
      to: "/settings/billing",
      search: {},
      replace: true,
    });
  }, [search.onboarding, navigate]);

  return (
    <PageTopBar title="Billing">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <Suspense fallback={<PageSkeleton />}>
          <SubscriptionSummary />
          <ConnectStatusSection />
        </Suspense>
      </div>
    </PageTopBar>
  );
}
