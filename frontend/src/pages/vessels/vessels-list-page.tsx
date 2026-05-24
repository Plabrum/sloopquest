import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListVessel } from "@/openapi/vessel/vessel";
import { vesselColumnDefs } from "@/openapi/vessel/columns.gen";

export function VesselsListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListVessel, columns: vesselColumnDefs });

  return (
    <PageTopBar
      title="Vessels"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="vessel_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={vesselColumnDefs}
          onRowClick={(row) => navigate({ to: "/vessels/$vesselId", params: { vesselId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
