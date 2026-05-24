import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import { getErrorMessage } from "@/lib/error-handler";

interface Props {
  threadId: string;
}

export function ReplyComposer({ threadId }: Props) {
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();
  const mutation = useActionsActionGroupObjectIdExecuteObjectAction({
    mutation: {
      onSuccess: () => {
        toast.success("Reply queued");
        setBody("");
        queryClient.invalidateQueries({ predicate: keyMatches("/email-threads") });
        queryClient.invalidateQueries({ predicate: keyMatches("/messages") });
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    },
  });

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    mutation.mutate({
      actionGroup: "email_thread_actions",
      objectId: threadId,
      data: {
        action: "email_thread_actions__reply_to_thread",
        data: { body_text: trimmed },
      },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Write a reply…"
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">⌘↩ to send</span>
        <Button type="submit" size="sm" disabled={mutation.isPending || !body.trim()}>
          <Send className="size-4" />
          {mutation.isPending ? "Sending…" : "Reply"}
        </Button>
      </div>
    </form>
  );
}

function keyMatches(prefix: string) {
  return (query: { queryKey: unknown }) =>
    Array.isArray(query.queryKey) &&
    typeof query.queryKey[0] === "string" &&
    (query.queryKey[0] as string).startsWith(prefix);
}
