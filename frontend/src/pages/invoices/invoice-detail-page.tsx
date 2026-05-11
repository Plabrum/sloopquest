import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoicesIdDetailHandlerSuspense } from "@/openapi/invoice/invoice";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function InvoiceDetailContent() {
  const { invoiceId } = useParams({ from: "/_authenticated/invoices/$invoiceId" });
  const { data } = useInvoicesIdDetailHandlerSuspense(invoiceId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("invoice_actions", invoiceId);

  return (
    <PageTopBar
      title={data.invoice_number ?? `Invoice ${invoiceId}`}
      breadcrumbSegments={[{ label: "Invoices", href: "/invoices" }]}
      actions={
        <ActionsMenu
          actions={actionsData?.actions ?? []}
          actionGroup="invoice_actions"
          objectId={invoiceId}
          objectData={data}
          onActionComplete={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: "Invoice #", value: data.invoice_number ?? "—" },
            { label: "State", value: data.state },
            { label: "Currency", value: data.currency },
            { label: "Subtotal", value: `$${(data.subtotal_cents / 100).toFixed(2)}` },
            { label: "Tax", value: `$${(data.tax_cents / 100).toFixed(2)}` },
            { label: "Total", value: `$${(data.total_cents / 100).toFixed(2)}` },
            { label: "Issued", value: data.issued_at ?? "—" },
            { label: "Due", value: data.due_at ?? "—" },
            { label: "Notes", value: data.notes ?? "—", span: 2 },
          ]}
        />
      </div>
    </PageTopBar>
  );
}

export function InvoiceDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Invoice" breadcrumbSegments={[{ label: "Invoices", href: "/invoices" }]}>
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
