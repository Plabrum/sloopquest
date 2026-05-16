import { Suspense } from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ActionsMenu } from "@/components/actions-menu";
import {
  EventFormBody,
  addressToInput,
} from "@/components/calendar/event-fields";
import { StateTransitionSelect } from "@/components/calendar/state-transition-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error-handler";
import {
  getCalendarEventsIdDetailHandlerQueryKey,
  useCalendarEventsIdDetailHandlerSuspense,
} from "@/openapi/calendar-events/calendar-events";
import {
  useActionsActionGroupObjectIdExecuteObjectAction,
  useActionsActionGroupObjectIdListObjectActions,
} from "@/openapi/actions/actions";
import type {
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
        queryClient.invalidateQueries({ queryKey: ["/calendar-events"] });
        refetchActions();
      },
      onError: (err) => toast.error(getErrorMessage(err, "Failed to update event")),
    },
  });

  const saveUpdate = (patch: Partial<UpdateCalendarEventData>) => {
    const data: UpdateCalendarEventData = {
      start: event.start ?? null,
      end: event.end ?? null,
      start_date: event.start_date ?? null,
      end_date: event.end_date ?? null,
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
  const transitionActions = allActions.filter((a) => a.target_state != null);
  const otherActions = allActions.filter(
    (a) => a.target_state == null && !a.action.endsWith("__update"),
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
            queryClient.invalidateQueries({ queryKey: ["/calendar-events"] });
            refetchActions();
            const wasDeleted = otherActions.some(
              (a) => a.action.endsWith("__delete"),
            );
            if (wasDeleted) onClose();
          }}
        />
      </div>

      <EventFormBody
        value={{
          start: event.start ?? null,
          end: event.end ?? null,
          start_date: event.start_date ?? null,
          end_date: event.end_date ?? null,
          all_day: event.all_day,
          name: event.name ?? null,
          address: addressToInput(event.address),
          description: event.description ?? null,
          attendees: event.attendees,
          survey_id: event.survey_id ?? null,
          client_id: event.client_id ?? null,
        }}
        onChange={saveUpdate}
      />

      <Meta event={event} />
    </div>
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
