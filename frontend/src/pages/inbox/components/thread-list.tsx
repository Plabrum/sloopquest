import { keepPreviousData } from "@tanstack/react-query";

import { useListEmailThread } from "@/openapi/emailthread/emailthread";
import type { InboxView } from "@/router/authenticated.routes";
import type {
  BooleanFilter,
  ListRequest,
  NullFilter,
} from "@/openapi/litestarAPI.schemas";

import { ThreadListItem } from "./thread-list-item";

interface Props {
  view: InboxView;
  activeThreadId?: string;
  onSelect: (id: string | undefined) => void;
}

const ARCHIVED_NULL: NullFilter = { type: "null", column: "archived_at", is_null: true };
const ARCHIVED_NOT_NULL: NullFilter = { type: "null", column: "archived_at", is_null: false };
const HAS_UNREAD: BooleanFilter = { type: "boolean", column: "has_unread_inbound", value: true };
const HAS_OUTBOUND: BooleanFilter = { type: "boolean", column: "has_outbound", value: true };

function buildRequest(view: InboxView): ListRequest {
  const filters: ListRequest["filters"] = [];
  if (view === "archived") {
    filters.push(ARCHIVED_NOT_NULL);
  } else {
    filters.push(ARCHIVED_NULL);
    if (view === "unread") filters.push(HAS_UNREAD);
    if (view === "sent") filters.push(HAS_OUTBOUND);
  }
  return { filters, limit: 100, offset: 0 };
}

export function ThreadList({ view, activeThreadId, onSelect }: Props) {
  const { data, isLoading } = useListEmailThread(buildRequest(view), {
    query: { placeholderData: keepPreviousData },
  });

  if (isLoading && !data) {
    return (
      <div className="flex-1 px-3 py-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="flex-1 px-3 py-6 text-sm text-muted-foreground">
        {emptyCopy(view)}
      </div>
    );
  }

  return (
    <ul className="flex-1 divide-y divide-border overflow-y-auto">
      {items.map((t) => (
        <ThreadListItem
          key={t.id}
          thread={t}
          active={t.id === activeThreadId}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </ul>
  );
}

function emptyCopy(view: InboxView): string {
  switch (view) {
    case "unread":
      return "No unread conversations.";
    case "sent":
      return "Nothing sent yet.";
    case "archived":
      return "No archived conversations.";
    default:
      return "Your inbox is empty.";
  }
}
