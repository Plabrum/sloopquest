import { useListCalendarEventSuspense } from "@/openapi/calendar-events/calendar-events";
import type { CalendarEventListItem } from "@/openapi/litestarAPI.schemas";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";
import type { CalendarView } from "./types";
import { buildWeekDays, getVisibleRange } from "./utils";

interface Props {
  view: CalendarView;
  anchor: Date;
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEventListItem) => void;
}

export function CalendarView({ view, anchor, onSelectDay, onSelectEvent }: Props) {
  const { start, end } = getVisibleRange(view, anchor);
  const { data } = useListCalendarEventSuspense({
    filters: [
      { type: "date", column: "start", start: start.toISOString(), finish: end.toISOString() },
    ],
    sorts: [{ column: "start", direction: "asc" }],
    limit: 500,
  });
  const events = data.items;

  if (view === "month") {
    return (
      <MonthView
        anchor={anchor}
        events={events}
        onSelectDay={onSelectDay}
        onSelectEvent={onSelectEvent}
      />
    );
  }

  const days = view === "week" ? buildWeekDays(anchor) : [anchor];
  return <TimeGrid days={days} events={events} onSelectEvent={onSelectEvent} />;
}
