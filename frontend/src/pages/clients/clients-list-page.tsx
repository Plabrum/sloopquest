import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListClient } from "@/openapi/client/client";
import { clientColumnDefs } from "@/openapi/client/columns.gen";

export function ClientsListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListClient, columns: clientColumnDefs });

  return (
    <PageTopBar
      title="Clients"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="client_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={clientColumnDefs}
          onRowClick={(row) => navigate({ to: "/clients/$clientId", params: { clientId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
