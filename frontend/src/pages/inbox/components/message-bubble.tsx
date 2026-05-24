import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessagesIdDetailHandler } from "@/openapi/inbox/inbox";
import type { MessageListItem } from "@/openapi/litestarAPI.schemas";

import { AttachmentsList } from "./attachments-list";

interface Props {
  messageId: string;
  preview: MessageListItem;
}

export function MessageBubble({ messageId, preview }: Props) {
  const { data, isLoading } = useMessagesIdDetailHandler(messageId);

  const outbound = preview.direction === "out";
  const failed = preview.state === "failed";
  const fromLabel = data?.from_email ?? preview.from_email ?? (outbound ? "You" : "(unknown sender)");
  const timestamp = data?.sent_at ?? data?.received_at ?? preview.sent_at ?? preview.received_at;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3",
        outbound && "border-l-2 border-l-primary",
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">{fromLabel}</span>
          {failed && (
            <AlertTriangle
              className="size-3.5 shrink-0 text-destructive"
              aria-label="Failed to send"
            />
          )}
        </div>
        {timestamp && (
          <time className="shrink-0 text-muted-foreground">
            {new Date(timestamp).toLocaleString()}
          </time>
        )}
      </header>
      {isLoading ? (
        <Skeleton className="h-16" />
      ) : (
        <>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
            {data?.body_text ?? preview.snippet ?? ""}
          </pre>
          {data?.attachments && data.attachments.length > 0 && (
            <AttachmentsList attachments={data.attachments} />
          )}
        </>
      )}
    </article>
  );
}
