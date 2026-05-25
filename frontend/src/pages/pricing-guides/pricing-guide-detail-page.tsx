import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import {
  ChildObjectList,
  ChildObjectRow,
} from "@/components/layout";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useChildObjectList } from "@/hooks/use-child-object-list";
import { usePricingGuidesIdDetailHandlerSuspense } from "@/openapi/pricing-guides/pricing-guides";
import { useListPricingTier } from "@/openapi/pricing-tiers/pricing-tiers";
import type { PricingTierListItem } from "@/openapi/litestarAPI.schemas";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";
import { formatCents } from "@/lib/format";

function PricingGuideDetailContent() {
  const { guideId } = useParams({ from: "/_authenticated/settings/pricing-guides/$guideId" });
  const { data } = usePricingGuidesIdDetailHandlerSuspense(guideId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("pricing_guide_actions", guideId);

  const { items: tiers } = useChildObjectList<PricingTierListItem>({
    listQuery: useListPricingTier,
    filters: [{ type: "text", column: "guide_id", operation: "equals", value: guideId }],
    defaultSorts: [{ column: "length_until_ft", direction: "asc" }],
  });

  return (
    <PageTopBar
      title={data.name}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="pricing_guide_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6 space-y-8">
        <KeyValueGrid
          items={[
            { label: "Name", value: data.name },
            { label: "Service Type", value: data.service_type },
            {
              label: "Status",
              value: data.is_active ? (
                <Badge>Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              ),
            },
            { label: "Created", value: data.created_at },
            { label: "Updated", value: data.updated_at },
          ]}
        />

        <ChildObjectList
          title="Tiers"
          badge={tiers.length || undefined}
          topLevelActions={
            <Suspense fallback={null}>
              <TopLevelActions
                actionGroup="pricing_tier_actions"
                formContext={{ guide_id: guideId }}
              />
            </Suspense>
          }
          items={tiers}
          emptyMessage="No tiers yet. Use Add Tier to create one."
          renderItem={(tier) => (
            <ChildObjectRow
              title={
                tier.length_until_ft != null
                  ? `Up to ${tier.length_until_ft} ft`
                  : "Any length"
              }
              subtitle={tier.pricing_type}
              status={
                <span className="text-sm font-medium">
                  {formatCents(tier.amount_cents)}
                </span>
              }
              actions={
                <ObjectActions
                  data={tier}
                  actionGroup="pricing_tier_actions"
                />
              }
            />
          )}
        />
      </div>
    </PageTopBar>
  );
}

export function PricingGuideDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Pricing Guide">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <PricingGuideDetailContent />
    </Suspense>
  );
}
