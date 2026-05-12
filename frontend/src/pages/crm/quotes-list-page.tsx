import { PageTopBar } from "@/components/layout/page-topbar";

export function QuotesListPage() {
  return (
    <PageTopBar title="Quotes">
      <div className="p-6">
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Quotes — coming soon
        </div>
      </div>
    </PageTopBar>
  );
}
