import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ChildObjectList, ChildObjectRow } from "@/components/layout";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useChildObjectList } from "@/hooks/use-child-object-list";
import { useInvoicesIdDetailHandlerSuspense } from "@/openapi/invoice/invoice";
import { useListInvoiceLineItem } from "@/openapi/invoice-line-items/invoice-line-items";
import type { InvoiceLineItemListItem } from "@/openapi/litestarAPI.schemas";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";
import { formatCents } from "@/lib/format";

function InvoiceDetailContent() {
  const { invoiceId } = useParams({ from: "/_authenticated/invoices/$invoiceId" });
  const { data } = useInvoicesIdDetailHandlerSuspense(invoiceId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("invoice_actions", invoiceId);

  const { items: lineItems } = useChildObjectList<InvoiceLineItemListItem>({
    listQuery: useListInvoiceLineItem,
    filters: [{ type: "text", column: "invoice_id", operation: "equals", value: invoiceId }],
    defaultSorts: [{ column: "sort_order", direction: "asc" }],
  });

  return (
    <PageTopBar
      title={data.identifier ?? `Invoice ${invoiceId}`}
      state={data.state}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="invoice_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6 space-y-8">
        <KeyValueGrid
          items={[
            { label: "Invoice #", value: data.identifier ?? "—" },
            { label: "Currency", value: data.currency },
            { label: "Subtotal", value: formatCents(data.subtotal_cents) },
            { label: "Tax", value: formatCents(data.tax_cents) },
            { label: "Total", value: formatCents(data.total_cents) },
            { label: "Issued", value: data.issued_at ?? "—" },
            { label: "Due", value: data.due_at ?? "—" },
            { label: "Notes", value: data.notes ?? "—", span: 2 },
          ]}
        />

        <ChildObjectList
          title="Line items"
          badge={lineItems.length || undefined}
          topLevelActions={
            <Suspense fallback={null}>
              <TopLevelActions
                actionGroup="invoice_line_item_actions"
                formContext={{ invoice_id: invoiceId }}
              />
            </Suspense>
          }
          items={lineItems}
          emptyMessage="No line items yet. Use Add Line Item to create one."
          renderItem={(item) => (
            <ChildObjectRow
              title={item.description}
              subtitle={`${item.quantity} × ${formatCents(item.unit_price_cents)}`}
              status={
                <span className="text-sm font-medium">
                  {formatCents(
                    Math.round(Number(item.quantity) * item.unit_price_cents),
                  )}
                </span>
              }
              actions={
                <ObjectActions data={item} actionGroup="invoice_line_item_actions" />
              }
            />
          )}
        />
      </div>
    </PageTopBar>
  );
}

export function InvoiceDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Invoice">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <InvoiceDetailContent />
    </Suspense>
  );
}
