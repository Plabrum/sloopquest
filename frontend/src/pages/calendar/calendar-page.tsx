import { Suspense, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarSkeleton } from "@/components/calendar/calendar-skeleton";
import { EventDetailPanel } from "@/components/calendar/event-detail-sheet";
import { isCalendarView, type CalendarView as CalendarViewType } from "@/components/calendar/types";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { getListCalendarEventQueryKey } from "@/openapi/calendar-events/calendar-events";
import { calendarRoute } from "@/router/authenticated.routes";

const ISO_DAY = "yyyy-MM-dd";

export function CalendarPage() {
  const search = calendarRoute.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const view: CalendarViewType = isCalendarView(search.view) ? search.view : "month";
  const anchor = useMemo(
    () => (search.date ? parseISO(search.date) : new Date()),
    [search.date],
  );

  const setView = (next: CalendarViewType) =>
    navigate({
      to: "/calendar",
      search: () => ({ view: next, date: search.date, event: search.event }),
      replace: true,
    });

  const setAnchor = (next: Date) =>
    navigate({
      to: "/calendar",
      search: () => ({ view: search.view, date: format(next, ISO_DAY), event: search.event }),
      replace: true,
    });

  const setEvent = (id: string | undefined) =>
    navigate({
      to: "/calendar",
      search: () => ({ view: search.view, date: search.date, event: id }),
      replace: true,
    });

  const setViewAndAnchor = (nextView: CalendarViewType, nextDate: Date) =>
    navigate({
      to: "/calendar",
      search: () => ({ view: nextView, date: format(nextDate, ISO_DAY), event: search.event }),
      replace: true,
    });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListCalendarEventQueryKey() });

  const shift = (direction: 1 | -1) => {
    if (view === "month") setAnchor(addMonths(anchor, direction));
    else if (view === "week") setAnchor(addWeeks(anchor, direction));
    else setAnchor(addDays(anchor, direction));
  };

  const title = view === "month"
    ? format(anchor, "MMMM yyyy")
    : view === "week"
      ? format(anchor, "'Week of' MMM d, yyyy")
      : format(anchor, "EEEE, MMM d, yyyy");

  return (
    <PageTopBar
      title="Calendar"
      actions={
        <TopLevelActions
          actionGroup="calendar_event_actions"
          onInvalidate={invalidateList}
        />
      }
    >
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 space-y-4 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <Tabs value={view} onValueChange={(v) => isCalendarView(v) && setView(v)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Suspense fallback={<CalendarSkeleton />}>
            <CalendarView
              view={view}
              anchor={anchor}
              onSelectDay={(day) => setViewAndAnchor("day", day)}
              onSelectEvent={(event) => setEvent(event.id)}
            />
          </Suspense>
        </div>

        {search.event && (
          <aside className="w-[22rem] shrink-0 border-l border-border bg-card">
            <EventDetailPanel eventId={search.event} onClose={() => setEvent(undefined)} />
          </aside>
        )}
      </div>
    </PageTopBar>
  );
}
