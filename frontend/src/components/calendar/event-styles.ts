import { CalendarEventState } from "@/openapi/litestarAPI.schemas";

export const eventStateClasses: Record<CalendarEventState, string> = {
  [CalendarEventState.tentative]:
    "border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100",
  [CalendarEventState.confirmed]:
    "border-l-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100",
  [CalendarEventState.completed]:
    "border-l-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  [CalendarEventState.cancelled]:
    "border-l-rose-500 bg-rose-50 text-rose-900 line-through hover:bg-rose-100",
};
