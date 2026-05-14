import { Suspense, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ActionsMenu } from "@/components/actions-menu";
import { StateTransitionSelect } from "@/components/calendar/state-transition-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EntityCombobox } from "@/lib/forms/entity-combobox";
import { getErrorMessage } from "@/lib/error-handler";
import {
  getCalendarEventsIdDetailHandlerQueryKey,
  getListCalendarEventQueryKey,
  useCalendarEventsIdDetailHandlerSuspense,
} from "@/openapi/calendar-events/calendar-events";
import {
  useActionsActionGroupObjectIdExecuteObjectAction,
  useActionsActionGroupObjectIdListObjectActions,
} from "@/openapi/actions/actions";
import type {
  AddressInput,
  CalendarEventDetail,
  UpdateCalendarEventData,
} from "@/openapi/litestarAPI.schemas";
import type { ActionDTO } from "@/lib/actions/types";

interface Props {
  eventId: string;
  onClose: () => void;
}

export function EventDetailPanel({ eventId, onClose }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Event</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Suspense fallback={<EventDetailSkeleton />}>
          <EventDetailContent eventId={eventId} onClose={onClose} />
        </Suspense>
      </div>
    </div>
  );
}

function EventDetailContent({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: event } = useCalendarEventsIdDetailHandlerSuspense(eventId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("calendar_event_actions", eventId);

  const execute = useActionsActionGroupObjectIdExecuteObjectAction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getCalendarEventsIdDetailHandlerQueryKey(eventId),
        });
        queryClient.invalidateQueries({ queryKey: getListCalendarEventQueryKey() });
        refetchActions();
      },
      onError: (err) => toast.error(getErrorMessage(err, "Failed to update event")),
    },
  });

  const saveUpdate = (patch: Partial<UpdateCalendarEventData>) => {
    const data: UpdateCalendarEventData = {
      start: event.start,
      end: event.end,
      all_day: event.all_day,
      name: event.name ?? null,
      address: addressToInput(event.address),
      description: event.description ?? null,
      attendees: event.attendees,
      survey_id: event.survey_id ?? null,
      client_id: event.client_id ?? null,
      ...patch,
    };
    execute.mutate({
      actionGroup: "calendar_event_actions",
      objectId: eventId,
      data: { action: "calendar_event_actions__update", data },
    });
  };

  const allActions = actionsData?.actions ?? [];
  const transitionActions = allActions.filter((a) => a.is_state_transition);
  const otherActions = allActions.filter(
    (a) => !a.is_state_transition && !a.action.endsWith("__update"),
  );

  const handleTransition = (action: ActionDTO) => {
    execute.mutate({
      actionGroup: "calendar_event_actions",
      objectId: eventId,
      // `action.action` is a runtime string; the discriminated union expects a
      // literal. The shape (`{action, data: {}}`) matches every transition variant.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { action: action.action, data: {} } as any,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {transitionActions.length === 0 ? (
          <StatusBadge status={event.state} />
        ) : (
          <StateTransitionSelect
            currentState={event.state}
            options={transitionActions}
            onSelect={handleTransition}
            disabled={execute.isPending}
          />
        )}
        <ActionsMenu
          actions={otherActions}
          actionGroup="calendar_event_actions"
          objectId={event.id}
          objectData={event}
          onActionComplete={() => {
            queryClient.invalidateQueries({
              queryKey: getCalendarEventsIdDetailHandlerQueryKey(eventId),
            });
            queryClient.invalidateQueries({ queryKey: getListCalendarEventQueryKey() });
            refetchActions();
            const wasDeleted = otherActions.some(
              (a) => a.action.endsWith("__delete"),
            );
            if (wasDeleted) onClose();
          }}
        />
      </div>

      <Field label="Start">
        <DateTimeInput
          value={event.start}
          onCommit={(iso) => saveUpdate({ start: iso })}
        />
      </Field>

      <Field label="End">
        <DateTimeInput
          value={event.end}
          onCommit={(iso) => saveUpdate({ end: iso })}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={event.all_day}
          onCheckedChange={(checked) => saveUpdate({ all_day: checked === true })}
        />
        All day
      </label>

      <Field label="Name">
        <TextField
          value={event.name ?? ""}
          placeholder="Add a title"
          onCommit={(v) => saveUpdate({ name: v || null })}
        />
      </Field>

      <AddressFields
        address={event.address}
        onChange={(next) => saveUpdate({ address: next })}
      />

      <Field label="Description">
        <TextAreaField
          value={event.description ?? ""}
          placeholder="Add notes"
          onCommit={(v) => saveUpdate({ description: v || null })}
        />
      </Field>

      <Field label="Attendees">
        <AttendeesField
          value={event.attendees}
          onCommit={(v) => saveUpdate({ attendees: v })}
        />
      </Field>

      <Field label="Survey">
        <EntityCombobox
          modelName="Survey"
          value={event.survey_id ?? ""}
          onChange={(v) => saveUpdate({ survey_id: v || null })}
        />
      </Field>

      <Field label="Client">
        <EntityCombobox
          modelName="Client"
          value={event.client_id ?? ""}
          onChange={(v) => saveUpdate({ client_id: v || null })}
        />
      </Field>

      <Meta event={event} />
    </div>
  );
}

function addressToInput(
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

const EMPTY_ADDRESS: AddressInput = {
  line1: "",
  line2: null,
  city: "",
  region: "",
  postal_code: "",
  country: "US",
};

function AddressFields({
  address,
  onChange,
}: {
  address: CalendarEventDetail["address"];
  onChange: (next: AddressInput | null) => void;
}) {
  const [showing, setShowing] = useState(false);
  const isOpen = Boolean(address) || showing;
  const base = addressToInput(address) ?? EMPTY_ADDRESS;
  const commit = (patch: Partial<AddressInput>) => {
    const next = { ...base, ...patch };
    const empty =
      !next.line1 && !next.city && !next.region && !next.postal_code && !next.line2;
    onChange(empty ? null : next);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowing(true)}
      >
        <Plus className="size-4" />
        Add address
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Address</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowing(false);
            if (address) onChange(null);
          }}
        >
          <X className="size-4" />
          Remove
        </Button>
      </div>
      <TextField
        value={base.line1}
        placeholder="Street"
        onCommit={(v) => commit({ line1: v })}
      />
      <TextField
        value={base.line2 ?? ""}
        placeholder="Apt, suite, etc. (optional)"
        onCommit={(v) => commit({ line2: v || null })}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          value={base.city}
          placeholder="City"
          onCommit={(v) => commit({ city: v })}
        />
        <TextField
          value={base.region}
          placeholder="State/Region"
          onCommit={(v) => commit({ region: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField
          value={base.postal_code}
          placeholder="Postal code"
          onCommit={(v) => commit({ postal_code: v })}
        />
        <TextField
          value={base.country ?? "US"}
          placeholder="Country"
          onCommit={(v) => commit({ country: v || "US" })}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TextField({
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

function TextAreaField({
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

function AttendeesField({
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

function DateTimeInput({
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

function Meta({ event }: { event: CalendarEventDetail }) {
  return (
    <div className="border-t border-border pt-3 text-xs text-muted-foreground">
      Created {format(parseISO(event.created_at), "MMM d, yyyy")}
    </div>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
