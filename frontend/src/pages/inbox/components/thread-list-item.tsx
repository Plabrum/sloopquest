import { ClipboardList, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { ThreadListItem as Thread } from "@/openapi/litestarAPI.schemas";

interface Props {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}

export function ThreadListItem({ thread, active, onClick }: Props) {
  const unread = thread.unread_count > 0;
  const fromLabel = thread.latest_from ?? "(no sender)";
  const subject = thread.subject ?? "(no subject)";
  const snippet = thread.latest_snippet ?? "";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors",
          active
            ? "bg-muted"
            : unread
              ? "hover:bg-muted/60"
              : "hover:bg-muted/40",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              unread ? "bg-primary" : "bg-transparent",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "truncate text-sm flex-1",
              unread ? "font-semibold text-foreground" : "text-foreground/80",
            )}
          >
            {fromLabel}
          </span>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(thread.latest_activity_at)}
          </time>
        </div>
        <div
          className={cn(
            "truncate text-sm",
            unread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {subject}
        </div>
        {snippet && (
          <div className="truncate text-xs text-muted-foreground">{snippet}</div>
        )}
        {(thread.client_id || thread.survey_id) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {thread.client_id && (
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                <Users className="size-3" /> Client
              </span>
            )}
            {thread.survey_id && (
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                <ClipboardList className="size-3" /> Survey
              </span>
            )}
          </div>
        )}
      </button>
    </li>
  );
}
