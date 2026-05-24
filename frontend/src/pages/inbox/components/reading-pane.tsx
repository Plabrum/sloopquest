import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ClipboardList, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import { useEmailThreadsIdDetailHandlerSuspense } from "@/openapi/emailthread/emailthread";
import { useListMessageSuspense } from "@/openapi/inbox/inbox";
import type { TextFilter } from "@/openapi/litestarAPI.schemas";
import { getErrorMessage } from "@/lib/error-handler";

import { MessageBubble } from "./message-bubble";
import { ReplyComposer } from "./reply-composer";

interface Props {
  threadId: string;
}

export function ReadingPane({ threadId }: Props) {
  const queryClient = useQueryClient();
  const { data: thread } = useEmailThreadsIdDetailHandlerSuspense(threadId);
  const threadIdFilter: TextFilter = {
    type: "text",
    column: "email_thread_id",
    operation: "equals",
    value: threadId,
  };
  const { data: messages } = useListMessageSuspense({
    filters: [threadIdFilter],
    sorts: [{ column: "created_at", direction: "asc" }],
    limit: 200,
    offset: 0,
  });

  const actionMutation = useActionsActionGroupObjectIdExecuteObjectAction();

  useEffect(() => {
    actionMutation.mutate(
      {
        actionGroup: "email_thread_actions",
        objectId: threadId,
        data: { action: "email_thread_actions__mark_thread_read", data: {} },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ predicate: keyMatches("/email-threads") });
          queryClient.invalidateQueries({ predicate: keyMatches("/messages") });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const archiveMutation = useActionsActionGroupObjectIdExecuteObjectAction({
    mutation: {
      onSuccess: () => {
        toast.success("Conversation archived");
        queryClient.invalidateQueries({ predicate: keyMatches("/email-threads") });
        queryClient.invalidateQueries({ predicate: keyMatches("/messages") });
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    },
  });

  const subject = thread.subject ?? "(no subject)";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{subject}</h2>
          {(thread.client_id || thread.survey_id) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {thread.client_id && (
                <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  <Users className="size-3" /> Client
                </span>
              )}
              {thread.survey_id && (
                <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  <ClipboardList className="size-3" /> Survey
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={archiveMutation.isPending || thread.archived_at !== null}
          onClick={() =>
            archiveMutation.mutate({
              actionGroup: "email_thread_actions",
              objectId: threadId,
              data: { action: "email_thread_actions__archive_thread", data: {} },
            })
          }
        >
          <Archive className="size-4" />
          {thread.archived_at ? "Archived" : "Archive"}
        </Button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.items.length === 0 ? (
          <Skeleton className="h-24" />
        ) : (
          messages.items.map((m) => <MessageBubble key={m.id} messageId={m.id} preview={m} />)
        )}
      </div>
      <div className="border-t border-border bg-card px-6 py-3">
        <ReplyComposer threadId={threadId} />
      </div>
    </div>
  );
}

function keyMatches(prefix: string) {
  return (query: { queryKey: unknown }) =>
    Array.isArray(query.queryKey) &&
    typeof query.queryKey[0] === "string" &&
    (query.queryKey[0] as string).startsWith(prefix);
}
