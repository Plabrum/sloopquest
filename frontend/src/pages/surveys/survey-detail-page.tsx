import { Suspense } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useSurveysIdDetailHandlerSuspense } from "@/openapi/survey/survey";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";
import { useListInvoice } from "@/openapi/invoice/invoice";
import { useListReport } from "@/openapi/report/report";
import { useListEmailThread } from "@/openapi/emailthread/emailthread";
import { reportColumnDefs } from "@/openapi/report/columns.gen";
import { emailThreadColumnDefs } from "@/openapi/emailthread/columns.gen";
import type { EntityRef, TextFilter } from "@/openapi/litestarAPI.schemas";

function EntityLink({ entity }: { entity: EntityRef | null | undefined }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;
  return (
    <Link to={entity.href} className="text-primary hover:underline">
      {entity.label}
    </Link>
  );
}

function surveyFilter(surveyId: string): TextFilter {
  return { type: "text", column: "survey_id", operation: "equals", value: surveyId };
}

function InvoiceSection({ surveyId }: { surveyId: string }) {
  const { data, isLoading } = useListInvoice({
    filters: [surveyFilter(surveyId)],
    limit: 1,
    offset: 0,
  });
  if (isLoading) return <Skeleton className="h-20 rounded-2xl" />;
  const invoice = data?.items?.[0];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Invoice</h3>
        {!invoice && (
          <TopLevelActions
            actionGroup="invoice_actions"
            formContext={{ survey_id: surveyId }}
            maxVisible={1}
          />
        )}
      </div>
      {invoice ? (
        <Link
          to="/invoices/$invoiceId"
          params={{ invoiceId: invoice.id }}
          className="block rounded-2xl border p-4 hover:bg-muted/50"
        >
          <KeyValueGrid
            items={[
              { label: "Invoice #", value: invoice.identifier ?? "—" },
              { label: "State", value: invoice.state },
              {
                label: "Total",
                value: `$${(invoice.total_cents / 100).toFixed(2)}`,
              },
              { label: "Due", value: invoice.due_at ?? "—" },
            ]}
          />
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">No invoice yet.</p>
      )}
    </section>
  );
}

function ReportsSection({ surveyId }: { surveyId: string }) {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListReport,
    columns: reportColumnDefs,
    baseFilters: [surveyFilter(surveyId)],
    paramPrefix: "reports",
    pageSize: 10,
  });
  return (
    <ResourceTable
      {...tableProps}
      columns={reportColumnDefs}
      onRowClick={(row) =>
        navigate({ to: "/reports/$reportId", params: { reportId: String(row.id) } })
      }
    />
  );
}

function InboxSection({ surveyId }: { surveyId: string }) {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListEmailThread,
    columns: emailThreadColumnDefs,
    baseFilters: [surveyFilter(surveyId)],
    paramPrefix: "threads",
    pageSize: 10,
  });
  return (
    <ResourceTable
      {...tableProps}
      columns={emailThreadColumnDefs}
      onRowClick={(row) =>
        navigate({ to: "/inbox", search: { thread: String(row.id) } })
      }
    />
  );
}

function SurveyDetailContent() {
  const { surveyId } = useParams({ from: "/_authenticated/surveys/$surveyId" });
  const { data } = useSurveysIdDetailHandlerSuspense(surveyId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("survey_actions", surveyId);

  return (
    <PageTopBar
      title="Survey"
      state={data.state}
      actions={
        <ActionsMenu
          actions={actionsData?.actions ?? []}
          actionGroup="survey_actions"
          objectId={surveyId}
          objectData={data}
          onActionComplete={() => refetchActions()}
        />
      }
    >
      <div className="space-y-8 p-6">
        <KeyValueGrid
          items={[
            { label: "Vessel", value: <EntityLink entity={data.vessel} /> },
            { label: "Surveyor", value: <EntityLink entity={data.surveyor} /> },
            { label: "Template", value: <EntityLink entity={data.template ?? null} /> },
          ]}
        />

        <InvoiceSection surveyId={surveyId} />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Reports</h3>
          <ReportsSection surveyId={surveyId} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Inbox</h3>
          <InboxSection surveyId={surveyId} />
        </section>

        {data.template && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <DynamicFormRenderer
              surveyId={surveyId}
              templateId={data.template.id}
              existingResponse={data.form_response ?? null}
            />
          </Suspense>
        )}
      </div>
    </PageTopBar>
  );
}

export function SurveyDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Survey">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <SurveyDetailContent />
    </Suspense>
  );
}
