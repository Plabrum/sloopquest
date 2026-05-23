import { Suspense, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumbTrail } from "@/stores/breadcrumb-trail";
import type { InboxMode } from "@/router/authenticated.routes";

interface InboxTopBarProps {
  mode: InboxMode;
  onModeChange: (mode: InboxMode) => void;
  center?: React.ReactNode;
  actions?: React.ReactNode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function InboxTopBar({
  mode,
  onModeChange,
  center,
  actions,
  fallback,
  children,
}: InboxTopBarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const push = useBreadcrumbTrail((s) => s.push);

  useEffect(() => {
    push({ url: pathname, label: "Inbox" });
  }, [pathname, push]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-sidebar-border bg-sidebar px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground" />
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if (value === "mail" || value === "calendar") onModeChange(value);
            }}
          >
            <TabsList>
              <TabsTrigger value="mail">Mail</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <Suspense fallback={fallback ?? <PageSkeleton />}>{children}</Suspense>
    </>
  );
}
