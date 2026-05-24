import { Suspense, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, PencilLine, Plus } from "lucide-react";

import { CalendarSkeleton } from "@/components/calendar/calendar-skeleton";
import { CalendarView } from "@/components/calendar/calendar-view";
import { EventCreatePanel } from "@/components/calendar/event-create-panel";
import { EventDetailPanel } from "@/components/calendar/event-detail-sheet";
import { isCalendarView, type CalendarView as CalendarViewType } from "@/components/calendar/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  inboxRoute,
  type InboxMode,
  type InboxSearch,
  type InboxView,
} from "@/router/authenticated.routes";

import { ComposeDrawer } from "./components/compose-drawer";
import { FilterChips } from "./components/filter-chips";
import { InboxTopBar } from "./components/inbox-topbar";
import { ReadingPane } from "./components/reading-pane";
import { ThreadList } from "./components/thread-list";

const ISO_DAY = "yyyy-MM-dd";

export function InboxPage() {
  const search = inboxRoute.useSearch();
  const navigate = useNavigate();
  const mode: InboxMode = search.mode === "calendar" ? "calendar" : "mail";

  const update = (next: Partial<InboxSearch>) =>
    navigate({
      to: "/inbox",
      search: () => ({ ...search, ...next }),
      replace: true,
    });

  const setMode = (next: InboxMode) =>
    navigate({
      to: "/inbox",
      search: () => (next === "calendar" ? { mode: "calendar" as const } : {}),
      replace: true,
    });

  if (mode === "calendar") {
    return <CalendarMode search={search} update={update} setMode={setMode} />;
  }
  return <MailMode search={search} update={update} setMode={setMode} />;
}

interface ModeProps {
  search: InboxSearch;
  update: (next: Partial<InboxSearch>) => void;
  setMode: (mode: InboxMode) => void;
}

function MailMode({ search, update, setMode }: ModeProps) {
  const view: InboxView = search.view ?? "all";
  const thread = search.thread;
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <InboxTopBar
      mode="mail"
      onModeChange={setMode}
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
            <FilterChips
              value={view}
              onChange={(next) => update({ view: next === "all" ? undefined : next })}
            />
          </div>
          <ThreadList
            view={view}
            activeThreadId={thread}
            onSelect={(id) => update({ thread: id })}
          />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          {thread ? (
            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
              <ReadingPane threadId={thread} />
            </Suspense>
          ) : (
            <EmptyMailState />
          )}
        </section>
      </div>
      <ComposeDrawer open={composeOpen} onOpenChange={setComposeOpen} />
    </InboxTopBar>
  );
}

function EmptyMailState() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Select a conversation to read it.
    </div>
  );
}

function CalendarMode({ search, update, setMode }: ModeProps) {
  const view: CalendarViewType = isCalendarView(search.calendarView)
    ? search.calendarView
    : "week";
  const anchor = useMemo(
    () => (search.date ? parseISO(search.date) : new Date()),
    [search.date],
  );

  const setView = (next: CalendarViewType) => update({ calendarView: next });
  const setAnchor = (next: Date) => update({ date: format(next, ISO_DAY) });
  const setEvent = (id: string | undefined) => update({ event: id, creating: undefined });
  const setCreating = (value: boolean) =>
    update({ creating: value ? true : undefined, event: value ? undefined : search.event });

  const setViewAndAnchor = (nextView: CalendarViewType, nextDate: Date) =>
    update({ calendarView: nextView, date: format(nextDate, ISO_DAY) });

  const shift = (direction: 1 | -1) => {
    if (view === "month") setAnchor(addMonths(anchor, direction));
    else if (view === "week") setAnchor(addWeeks(anchor, direction));
    else setAnchor(addDays(anchor, direction));
  };

  const title =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : view === "week"
        ? format(anchor, "'Week of' MMM d, yyyy")
        : format(anchor, "EEEE, MMM d, yyyy");

  return (
    <InboxTopBar
      mode="calendar"
      onModeChange={setMode}
      center={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="text-sm font-semibold text-sidebar-foreground">{title}</h2>
          <Tabs
            value={view}
            onValueChange={(v) => isCalendarView(v) && setView(v)}
            className="ml-2"
          >
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New event
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<CalendarSkeleton />}>
              <CalendarView
                view={view}
                anchor={anchor}
                onSelectDay={(day) => setViewAndAnchor("day", day)}
                onSelectEvent={(event) => setEvent(event.id)}
              />
            </Suspense>
          </div>
        </div>

        {search.creating && (
          <aside className="w-[22rem] shrink-0 border-l border-border bg-card">
            <EventCreatePanel
              initialStart={anchor}
              onClose={() => setCreating(false)}
              onCreated={(id) => {
                setCreating(false);
                setEvent(id);
              }}
            />
          </aside>
        )}

        {!search.creating && search.event && (
          <aside className="w-[22rem] shrink-0 border-l border-border bg-card">
            <EventDetailPanel eventId={search.event} onClose={() => setEvent(undefined)} />
          </aside>
        )}
      </div>
    </InboxTopBar>
  );
}
