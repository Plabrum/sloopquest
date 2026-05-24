import { Suspense } from "react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSubscription } from "@/openapi/subscription/subscription";
import { subscriptionColumnDefs } from "@/openapi/subscription/columns.gen";

export function SubscriptionsPage() {
  const { tableProps } = useResourceTable({ listQuery: useListSubscription, columns: subscriptionColumnDefs });

  return (
    <PageTopBar
      title="Subscriptions"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="subscription_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={subscriptionColumnDefs}
        />
      </div>
    </PageTopBar>
  );
}
