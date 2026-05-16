import { SurveyKanban } from "@/components/kanban/survey-kanban";
import type { WidgetRead } from "../types";

export function KanbanWidget({ widget }: { widget: WidgetRead }) {
  const resource = widget.query.resource;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {widget.title}
        </h3>
      </div>
      <div className="min-h-0 flex-1 p-3">
        {resource === "surveys" ? (
          <SurveyKanban />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Kanban view not available for {resource}
          </div>
        )}
      </div>
    </div>
  );
}
