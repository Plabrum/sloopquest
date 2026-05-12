import { Suspense } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthMeMeSuspense } from "@/openapi/auth/auth";
import { LlmDock } from "@/components/layout/llm-dock";
import { QueryBoundary } from "@/components/query-boundary";

function AuthenticatedLayoutContent() {
  const { data: user } = useAuthMeMeSuspense();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "210px",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <div className="flex flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <QueryBoundary resetKey={pathname}>
              <Outlet />
            </QueryBoundary>
          </div>
          <LlmDock />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AuthenticatedLayout() {
  return (
    <Suspense>
      <AuthenticatedLayoutContent />
    </Suspense>
  );
}
