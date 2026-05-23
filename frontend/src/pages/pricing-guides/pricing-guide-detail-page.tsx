import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePricingGuidesIdDetailHandlerSuspense } from "@/openapi/pricing-guides/pricing-guides";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function PricingGuideDetailContent() {
  const { guideId } = useParams({ from: "/_authenticated/pricing-guides/$guideId" });
  const { data } = usePricingGuidesIdDetailHandlerSuspense(guideId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("pricing_guide_actions", guideId);

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
            { label: "Active", value: data.is_active ? "Yes" : "No" },
            { label: "Created", value: data.created_at },
            { label: "Updated", value: data.updated_at },
          ]}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Tiers</h3>
          {data.tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tiers yet. Use Add Tier to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Length Range (ft)</TableHead>
                  <TableHead>Pricing Type</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tiers.map((tier) => (
                  <TableRow key={String(tier.id)}>
                    <TableCell>{tier.service_type ?? "—"}</TableCell>
                    <TableCell>
                      {tier.length_min_ft != null || tier.length_max_ft != null
                        ? `${tier.length_min_ft ?? "—"} – ${tier.length_max_ft ?? "—"}`
                        : "—"}
                    </TableCell>
                    <TableCell>{tier.pricing_type}</TableCell>
                    <TableCell>
                      {tier.amount_cents != null
                        ? `$${(tier.amount_cents / 100).toFixed(2)}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
