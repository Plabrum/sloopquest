import { useState } from "react";
import { addMinutes } from "date-fns";
import { X } from "lucide-react";
import {
  EventFormBody,
  type EventFormValues,
} from "@/components/calendar/event-fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CalendarEventState } from "@/openapi/litestarAPI.schemas";
import { useActionExecutor } from "@/hooks/actions/use-action-executor";
import type { ActionDTO } from "@/lib/actions/types";

interface Props {
  initialStart?: Date;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function makeInitialDraft(start: Date): EventFormValues {
  return {
    start: start.toISOString(),
    end: addMinutes(start, 60).toISOString(),
    start_date: null,
    end_date: null,
    all_day: false,
    name: null,
    address: null,
    description: null,
    attendees: [],
    survey_id: null,
    client_id: null,
  };
}

const CREATE_ACTION: ActionDTO = {
  action: "calendar_event_actions__create",
  label: "Create event",
};

export function EventCreatePanel({ initialStart, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState<EventFormValues>(() =>
    makeInitialDraft(initialStart ?? new Date()),
  );

  const executor = useActionExecutor({
    actionGroup: "calendar_event_actions",
    onSuccess: (_action, response) => {
      if (response.created_id) onCreated(response.created_id);
      else onClose();
    },
  });

  const handleCreate = () => {
    executor.executeAction(CREATE_ACTION, {
      action: "calendar_event_actions__create",
      data: draft,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">New event</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          <StatusBadge status={CalendarEventState.confirmed} />
          <EventFormBody
            value={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="outline" onClick={onClose} disabled={executor.isExecuting}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={executor.isExecuting}>
          {executor.isExecuting ? "Creating..." : "Create"}
        </Button>
      </div>
    </div>
  );
}
