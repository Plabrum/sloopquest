import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListPricingGuide } from "@/openapi/pricing-guides/pricing-guides";
import { pricingGuideColumnDefs } from "@/openapi/pricing_guides/columns.gen";

export function PricingGuidesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListPricingGuide,
    columns: pricingGuideColumnDefs,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Pricing Guides</h2>
          <p className="text-sm text-muted-foreground">
            Fee schedules used when generating quotes. Exactly one is active at a time.
          </p>
        </div>
        <Suspense>
          <TopLevelActions actionGroup="pricing_guide_actions" />
        </Suspense>
      </div>
      <ResourceTable
        {...tableProps}
        columns={pricingGuideColumnDefs}
        onRowClick={(row) =>
          navigate({
            to: "/settings/pricing-guides/$guideId",
            params: { guideId: String(row.id) },
          })
        }
      />
    </div>
  );
}
