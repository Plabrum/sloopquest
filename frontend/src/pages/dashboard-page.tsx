import { Suspense } from "react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { DashboardRenderer } from "@/components/dashboard/dashboard-renderer";
import { useGetDashboardSuspense } from "@/openapi/dashboard/dashboard";

function DashboardContent() {
  const { data } = useGetDashboardSuspense({
    query: { staleTime: Infinity },
  });
  return <DashboardRenderer widgets={data.widgets} />;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 p-6">
      {[4, 2, 2, 4].map((cols, i) => (
        <div
          key={i}
          className={`col-span-${cols} h-56 animate-pulse rounded-2xl bg-muted`}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  return (
    <PageTopBar title="Dashboard">
      <div className="p-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </PageTopBar>
  );
}
