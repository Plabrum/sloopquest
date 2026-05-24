import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarView } from "./types";

export function getVisibleRange(view: CalendarView, anchor: Date): { start: Date; end: Date } {
  switch (view) {
    case "month": {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    case "week":
      return {
        start: startOfWeek(anchor, { weekStartsOn: 0 }),
        end: endOfWeek(anchor, { weekStartsOn: 0 }),
      };
    case "day":
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }
}

export function buildMonthGrid(anchor: Date): Date[] {
  const { start } = getVisibleRange("month", anchor);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function buildWeekDays(anchor: Date): Date[] {
  const { start } = getVisibleRange("week", anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const HOUR_START = 6;
export const HOUR_END = 22;
export const HOUR_VISIBLE_START = 9;
export const HOUR_VISIBLE_END = 17;
export const HOUR_PX_MIN = 48;

export function minutesFromDayStart(date: Date): number {
  return (date.getHours() - HOUR_START) * 60 + date.getMinutes();
}

export function clampToVisibleHours(start: Date, end: Date, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(HOUR_START, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(HOUR_END, 0, 0, 0);
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  return { clampedStart, clampedEnd };
}
