import { useLayoutEffect, useRef, useState } from "react";
import { format, isSameDay, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEventListItem } from "@/openapi/litestarAPI.schemas";
import { eventStateClasses } from "./event-styles";
import {
  HOUR_END,
  HOUR_PX_MIN,
  HOUR_START,
  HOUR_VISIBLE_END,
  HOUR_VISIBLE_START,
  clampToVisibleHours,
  minutesFromDayStart,
} from "./utils";

interface Props {
  days: Date[];
  events: CalendarEventListItem[];
  onSelectEvent: (event: CalendarEventListItem) => void;
}

const VISIBLE_HOURS = HOUR_VISIBLE_END - HOUR_VISIBLE_START;

export function TimeGrid({ days, events, onSelectEvent }: Props) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollHeight, setScrollHeight] = useState<number | null>(null);
  const didInitialScroll = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - 8;
      setScrollHeight(Math.max(VISIBLE_HOURS * HOUR_PX_MIN, available));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const effectiveHeight = scrollHeight ?? VISIBLE_HOURS * HOUR_PX_MIN;
  const hourPx = effectiveHeight / VISIBLE_HOURS;

  useLayoutEffect(() => {
    if (didInitialScroll.current || scrollHeight === null) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = (HOUR_VISIBLE_START - HOUR_START) * hourPx;
    didInitialScroll.current = true;
  }, [scrollHeight, hourPx]);

  const gridHeight = hours.length * hourPx;
  const allDay = events.filter((e) => e.all_day);
  const timed = events.filter((e) => !e.all_day);

  return (
    <div className="rounded-lg border bg-background overflow-hidden flex flex-col">
      <div className="grid border-b" style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-r bg-muted/40" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-r last:border-r-0 px-2 py-2 text-center text-xs",
              isToday(day) && "bg-accent/40",
            )}
          >
            <div className="text-muted-foreground uppercase tracking-wide">{format(day, "EEE")}</div>
            <div className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {allDay.length > 0 && (
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="border-r bg-muted/40 px-2 py-1 text-[10px] uppercase text-muted-foreground">
            All-day
          </div>
          {days.map((day) => {
            const dayEvents = allDay.filter((e) => spansDay(e, day));
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-1 space-y-0.5">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      "block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-[11px]",
                      eventStateClasses[event.state],
                    )}
                  >
                    {event.name || "Untitled event"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} className="overflow-y-auto" style={{ height: effectiveHeight }}>
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))`, height: gridHeight }}
        >
          <div className="border-r bg-muted/20">
            {hours.map((h) => (
              <div
                key={h}
                className="px-2 pt-1 text-right text-[10px] uppercase tracking-wide text-muted-foreground"
                style={{ height: hourPx }}
              >
                {format(new Date().setHours(h, 0, 0, 0), "ha").toLowerCase()}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              events={timed.filter((e) => spansDay(e, day))}
              onSelectEvent={onSelectEvent}
              hours={hours}
              hourPx={hourPx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  events,
  hours,
  hourPx,
  onSelectEvent,
}: {
  day: Date;
  events: CalendarEventListItem[];
  hours: number[];
  hourPx: number;
  onSelectEvent: (event: CalendarEventListItem) => void;
}) {
  return (
    <div className="relative border-r last:border-r-0">
      {hours.map((h) => (
        <div key={h} className="border-t border-border/60" style={{ height: hourPx }} />
      ))}
      {events.map((event) => {
        const start = parseISO(event.start!);
        const end = parseISO(event.end!);
        const { clampedStart, clampedEnd } = clampToVisibleHours(start, end, day);
        if (clampedEnd <= clampedStart) return null;
        const top = (minutesFromDayStart(clampedStart) / 60) * hourPx;
        const height = Math.max(
          ((clampedEnd.getTime() - clampedStart.getTime()) / 1000 / 60 / 60) * hourPx,
          18,
        );
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            className={cn(
              "absolute left-1 right-1 overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left text-[11px] leading-tight",
              eventStateClasses[event.state],
            )}
            style={{ top, height }}
          >
            <div className="font-medium">
              {format(start, "HH:mm")}–{format(end, "HH:mm")}
            </div>
            <div className="truncate font-medium">{event.name || "Untitled event"}</div>
            {event.address_line1 && (
              <div className="truncate text-muted-foreground">{event.address_line1}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function spansDay(event: CalendarEventListItem, day: Date): boolean {
  if (event.all_day) {
    const startDate = parseISO(event.start_date!);
    const endDate = parseISO(event.end_date!);
    return (
      isSameDay(startDate, day) ||
      isSameDay(endDate, day) ||
      (startDate < day && endDate > day)
    );
  }
  const start = parseISO(event.start!);
  const end = parseISO(event.end!);
  if (isSameDay(start, day) || isSameDay(end, day)) return true;
  return start < day && end > day;
}
