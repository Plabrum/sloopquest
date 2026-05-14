import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { format, isSameDay, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Values are wire-format `YYYY-MM-DD` strings (not Date objects) so they
// round-trip through URL search params cleanly.

export interface DateRangePickerProps {
  startDate: string | undefined;
  endDate: string | undefined;
  onChange: (range: { startDate: string | undefined; endDate: string | undefined }) => void;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  return parse(value, "yyyy-MM-dd", new Date());
}

function fromDate(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  return format(value, "yyyy-MM-dd");
}

function displayLabel(start: string | undefined, end: string | undefined, placeholder: string): string {
  const fmt = (s: string) => format(parse(s, "yyyy-MM-dd", new Date()), "MMM d, yyyy");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `${fmt(start)} – …`;
  return placeholder;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Pick a date range",
  triggerClassName,
  disabled,
  open: openProp,
  onOpenChange,
}: DateRangePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          // Visual contract matches `FilterSelect`: `h-9` height, `bg-card`
          // surface, focus ring. Filter rows that mix this picker with a
          // FilterSelect read as one design family.
          className={cn(
            "h-9 justify-start gap-2 bg-card font-normal",
            !startDate && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <CalendarIcon className="size-4" />
          {displayLabel(startDate, endDate, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarBody
          startDate={startDate}
          endDate={endDate}
          onCommit={(nextStart, nextEnd) => {
            if (nextStart !== startDate || nextEnd !== endDate) {
              onChange({ startDate: nextStart, endDate: nextEnd });
            }
          }}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// Inner component so its state lives only for one open session — Radix
// PopoverContent unmounts on close, so each open starts with a fresh draft
// and a fresh "first-click" flag. This lets the user click the same day
// twice to set a single-day range.
function CalendarBody({
  startDate,
  endDate,
  onCommit,
  onClose,
}: {
  startDate: string | undefined;
  endDate: string | undefined;
  onCommit: (startDate: string | undefined, endDate: string | undefined) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DateRange | undefined>(() =>
    startDate || endDate ? { from: toDate(startDate), to: toDate(endDate) } : undefined,
  );
  const [touched, setTouched] = useState(false);

  // Commit on unmount (popover dismissed); ref keeps the cleanup fresh.
  const commitOnUnmount = useRef<() => void>(() => {});
  commitOnUnmount.current = () => {
    if (!touched) return;
    // If user only clicked once, treat it as a single-day range.
    onCommit(fromDate(draft?.from), fromDate(draft?.to ?? draft?.from));
  };
  useEffect(() => () => commitOnUnmount.current(), []);

  const handleSelect = (clicked: Date) => {
    // First click in a session discards the prior range and starts fresh.
    if (!touched) {
      setTouched(true);
      setDraft({ from: clicked, to: undefined });
      return;
    }
    const from = draft?.from;
    const next: DateRange =
      !from || isSameDay(from, clicked)
        ? { from: clicked, to: clicked }
        : clicked < from
          ? { from: clicked, to: from }
          : { from, to: clicked };
    setDraft(next);
    onClose();
  };

  return (
    <Calendar
      mode="range"
      numberOfMonths={1}
      selected={draft}
      onSelect={(_range, clicked) => handleSelect(clicked)}
    />
  );
}
