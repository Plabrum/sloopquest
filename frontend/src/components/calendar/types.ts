export type CalendarView = "month" | "week" | "day";

export const isCalendarView = (v: unknown): v is CalendarView =>
  v === "month" || v === "week" || v === "day";
