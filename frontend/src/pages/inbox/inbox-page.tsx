import { Suspense, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PencilLine } from "lucide-react";

import { PageTopBar } from "@/components/layout/page-topbar";
import { Button } from "@/components/ui/button";
import { inboxRoute, type InboxView } from "@/router/authenticated.routes";

import { ComposeDrawer } from "./components/compose-drawer";
import { FilterChips } from "./components/filter-chips";
import { ReadingPane } from "./components/reading-pane";
import { ThreadList } from "./components/thread-list";

export function InboxPage() {
  const navigate = useNavigate();
  const { view = "all", thread } = inboxRoute.useSearch();
  const [composeOpen, setComposeOpen] = useState(false);

  const setView = (next: InboxView) => {
    navigate({
      to: "/inbox",
      search: () => ({ view: next === "all" ? undefined : next }),
      replace: true,
    });
  };

  const setThread = (id: string | undefined) => {
    navigate({
      to: "/inbox",
      search: () => ({ view: view === "all" ? undefined : view, thread: id }),
      replace: true,
    });
  };

  return (
    <PageTopBar
      title="Inbox"
      actions={
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <PencilLine className="size-4" />
          Compose
        </Button>
      }
    >
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <aside className="flex w-[22rem] shrink-0 flex-col border-r border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <FilterChips value={view} onChange={setView} />
          </div>
          <ThreadList view={view} activeThreadId={thread} onSelect={setThread} />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          {thread ? (
            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
              <ReadingPane threadId={thread} />
            </Suspense>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
      <ComposeDrawer open={composeOpen} onOpenChange={setComposeOpen} />
    </PageTopBar>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Select a conversation to read it.
    </div>
  );
}
