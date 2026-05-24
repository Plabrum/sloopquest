import { ResourceKanban } from "@/components/kanban/resource-kanban";
import type { WidgetRead } from "../types";

export function KanbanWidget({ widget }: { widget: WidgetRead }) {
  const { resource, filters, columns, limit, allowed_columns, column_rules } =
    widget.query;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {widget.title}
        </h3>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <ResourceKanban
          resource={resource}
          filters={filters}
          allowedColumns={allowed_columns}
          columnRules={column_rules}
          cardColumns={columns}
          limit={limit ?? undefined}
        />
      </div>
    </div>
  );
}
