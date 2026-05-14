import { format, isSameDay, isSameMonth, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEventListItem } from "@/openapi/litestarAPI.schemas";
import { buildMonthGrid } from "./utils";
import { eventStateClasses } from "./event-styles";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 2;

interface Props {
  anchor: Date;
  events: CalendarEventListItem[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEventListItem) => void;
}

export function MonthView({ anchor, events, onSelectDay, onSelectEvent }: Props) {
  const days = buildMonthGrid(anchor);
  const eventsByDay = groupEventsByDay(events);

  return (
    <div className="rounded-lg border bg-border overflow-hidden">
      <div className="grid grid-cols-7 bg-muted text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-[7rem] flex-col items-stretch bg-background p-1.5 text-left hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring",
                !inMonth && "bg-muted/40 text-muted-foreground",
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium leading-none",
                    today && "text-primary font-semibold",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > MAX_VISIBLE && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - MAX_VISIBLE}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        e.preventDefault();
                        onSelectEvent(event);
                      }
                    }}
                    className={cn(
                      "truncate rounded-sm border-l-2 px-1.5 py-0.5 text-[11px] leading-tight",
                      eventStateClasses[event.state],
                    )}
                  >
                    {!event.all_day && (
                      <span className="mr-1 font-medium">
                        {format(parseISO(event.start), "HH:mm")}
                      </span>
                    )}
                    {eventLabel(event)}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function groupEventsByDay(events: CalendarEventListItem[]): Map<string, CalendarEventListItem[]> {
  const map = new Map<string, CalendarEventListItem[]>();
  for (const event of events) {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
      cursor.setDate(cursor.getDate() + 1);
      if (isSameDay(cursor, end) && end.getHours() === 0 && end.getMinutes() === 0) break;
    }
  }
  return map;
}

function eventLabel(event: CalendarEventListItem): string {
  return event.name || "Untitled event";
}
