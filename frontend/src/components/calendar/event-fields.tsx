import { useEffect, useRef, useState } from "react";
import { addMinutes, format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AddressFields } from "@/components/calendar/address-fields";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EntityCombobox } from "@/lib/forms/entity-combobox";
import type {
  AddressInput,
  CalendarEventDetail,
} from "@/openapi/litestarAPI.schemas";

export interface EventFormValues {
  // For timed events: ISO datetimes. Null when all_day is true.
  start: string | null;
  end: string | null;
  // For all-day events: "yyyy-MM-dd" date strings (inclusive). Null when all_day is false.
  start_date: string | null;
  end_date: string | null;
  all_day: boolean;
  name: string | null;
  address: AddressInput | null;
  description: string | null;
  attendees: string[];
  survey_id: string | null;
  client_id: string | null;
}

export function EventFormBody({
  value,
  onChange,
}: {
  value: EventFormValues;
  onChange: (patch: Partial<EventFormValues>) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value.all_day}
          onCheckedChange={(checked) => {
            const all_day = checked === true;
            if (all_day) {
              // Anchor to today (or the existing start day if we have one).
              const day = value.start ? parseISO(value.start) : new Date();
              const dateStr = format(day, "yyyy-MM-dd");
              onChange({
                all_day,
                start: null,
                end: null,
                start_date: dateStr,
                end_date: dateStr,
              });
            } else {
              const day = value.start_date
                ? parseISO(value.start_date)
                : new Date();
              const start = new Date(day);
              start.setHours(9, 0, 0, 0);
              onChange({
                all_day,
                start: start.toISOString(),
                end: addMinutes(start, 60).toISOString(),
                start_date: null,
                end_date: null,
              });
            }
          }}
        />
        All day
      </label>

      {value.all_day ? (
        <Field label="Dates">
          <AllDayRangeField value={value} onChange={onChange} />
        </Field>
      ) : (
        <>
          <Field label="Start">
            <DateTimeInput
              value={value.start ?? new Date().toISOString()}
              onCommit={(iso) => onChange({ start: iso })}
            />
          </Field>

          <Field label="End">
            <DateTimeInput
              value={value.end ?? new Date().toISOString()}
              onCommit={(iso) => onChange({ end: iso })}
            />
          </Field>
        </>
      )}

      <Field label="Name">
        <TextField
          value={value.name ?? ""}
          placeholder="Add a title"
          onCommit={(v) => onChange({ name: v || null })}
        />
      </Field>

      <AddressFields
        value={value.address}
        onChange={(next) => onChange({ address: next })}
      />

      <Field label="Description">
        <TextAreaField
          value={value.description ?? ""}
          placeholder="Add notes"
          onCommit={(v) => onChange({ description: v || null })}
        />
      </Field>

      <Field label="Attendees">
        <AttendeesField
          value={value.attendees}
          onCommit={(v) => onChange({ attendees: v })}
        />
      </Field>

      <Field label="Survey">
        <EntityCombobox
          modelName="Survey"
          value={value.survey_id ?? ""}
          onChange={(v) => onChange({ survey_id: v || null })}
        />
      </Field>

      <Field label="Client">
        <EntityCombobox
          modelName="Client"
          value={value.client_id ?? ""}
          onChange={(v) => onChange({ client_id: v || null })}
        />
      </Field>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

export function TextAreaField({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Textarea
      value={draft}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

export function AttendeesField({
  value,
  onCommit,
}: {
  value: string[];
  onCommit: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState(value.join(", "));
  const last = useRef(value);
  useEffect(() => {
    last.current = value;
    setDraft(value.join(", "));
  }, [value]);
  return (
    <Input
      value={draft}
      placeholder="email@example.com, email2@example.com"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parts = draft
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.join(",") !== last.current.join(",")) onCommit(parts);
      }}
    />
  );
}

function AllDayRangeField({
  value,
  onChange,
}: {
  value: EventFormValues;
  onChange: (patch: Partial<EventFormValues>) => void;
}) {
  return (
    <DateRangePicker
      startDate={value.start_date ?? undefined}
      endDate={value.end_date ?? undefined}
      onChange={(next) => {
        if (!next.startDate || !next.endDate) return;
        onChange({ start_date: next.startDate, end_date: next.endDate });
      }}
    />
  );
}

export function DateTimeInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (iso: string) => void;
}) {
  const current = parseISO(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(current, "PPP p")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={current}
          defaultMonth={current}
          onSelect={(date) => {
            if (!date) return;
            const next = new Date(current);
            next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            if (next.getTime() !== current.getTime()) onCommit(next.toISOString());
          }}
        />
        <div className="border-t p-3">
          <Input
            type="time"
            value={format(current, "HH:mm")}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(":").map(Number);
              const next = new Date(current);
              next.setHours(hours, minutes, 0, 0);
              if (next.getTime() !== current.getTime()) onCommit(next.toISOString());
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function addressToInput(
  address: CalendarEventDetail["address"],
): AddressInput | null {
  if (!address) return null;
  return {
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region,
    postal_code: address.postal_code,
    country: address.country,
  };
}
