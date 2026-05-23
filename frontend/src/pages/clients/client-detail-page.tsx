import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientsIdDetailHandlerSuspense } from "@/openapi/client/client";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function ClientDetailContent() {
  const { clientId } = useParams({ from: "/_authenticated/clients/$clientId" });
  const { data } = useClientsIdDetailHandlerSuspense(clientId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("client_actions", clientId);

  return (
    <PageTopBar
      title={data.display_name}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="client_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: "Name", value: data.display_name },
            { label: "Type", value: data.client_type },
            { label: "Email", value: data.email ?? "—" },
            { label: "Phone", value: data.phone ?? "—" },
            { label: "First Name", value: data.first_name ?? "—" },
            { label: "Last Name", value: data.last_name ?? "—" },
            { label: "Company", value: data.company_name ?? "—" },
            { label: "Brokerage", value: data.brokerage_name ?? "—" },
            { label: "Agent", value: data.agent_name ?? "—" },
            { label: "License #", value: data.license_number ?? "—" },
            { label: "Institution", value: data.institution_name ?? "—" },
            { label: "Loan Officer", value: data.loan_officer_name ?? "—" },
          ]}
        />
      </div>
    </PageTopBar>
  );
}

export function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Client">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <ClientDetailContent />
    </Suspense>
  );
}
