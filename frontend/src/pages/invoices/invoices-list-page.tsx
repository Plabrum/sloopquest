import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListInvoice } from "@/openapi/invoice/invoice";
import { invoiceColumnDefs } from "@/openapi/invoice/columns.gen";

export function InvoicesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListInvoice, columns: invoiceColumnDefs });

  return (
    <PageTopBar
      title="Invoices"
      actions={<TopLevelActions actionGroup="invoice_actions" />}
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={invoiceColumnDefs}
          onRowClick={(row) => navigate({ to: "/invoices/$invoiceId", params: { invoiceId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
