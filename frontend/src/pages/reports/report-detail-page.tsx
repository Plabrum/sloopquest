import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportsIdDetailHandlerSuspense } from "@/openapi/report/report";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function ReportDetailContent() {
  const { reportId } = useParams({ from: "/_authenticated/reports/$reportId" });
  const { data } = useReportsIdDetailHandlerSuspense(reportId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("report_actions", reportId);

  return (
    <PageTopBar
      title={data.title ?? "Report"}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="report_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: "Title", value: data.title ?? "—" },
            { label: "State", value: data.state },
            { label: "Survey ID", value: data.survey_id },
            {
              label: "Market Value",
              value: data.market_value_cents != null
                ? `$${(data.market_value_cents / 100).toFixed(2)}`
                : "—",
            },
            {
              label: "Replacement Value",
              value: data.replacement_value_cents != null
                ? `$${(data.replacement_value_cents / 100).toFixed(2)}`
                : "—",
            },
            { label: "Released", value: data.released_at ?? "—" },
            { label: "Summary", value: data.summary ?? "—", span: 2 },
          ]}
        />
      </div>
    </PageTopBar>
  );
}

export function ReportDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Report">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <ReportDetailContent />
    </Suspense>
  );
}
