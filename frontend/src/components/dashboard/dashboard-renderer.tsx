import { QueryBoundary } from "@/components/query-boundary";
import { WidgetSkeleton } from "./widget-skeleton";
import { AreaChartWidget } from "./widgets/area-chart-widget";
import { BarChartWidget } from "./widgets/bar-chart-widget";
import { StatNumberWidget } from "./widgets/stat-number-widget";
import { ResourceTableWidget } from "./widgets/resource-table-widget";
import { ChildListWidget } from "./widgets/child-list-widget";
import { KanbanWidget } from "./widgets/kanban-widget";
import type { WidgetRead } from "./types";

function DefaultWidgetError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-28 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card p-4 text-center">
      <p className="text-sm font-medium text-foreground">Widget failed to load</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-medium text-primary hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

function WidgetContent({ widget }: { widget: WidgetRead }) {
  switch (widget.type) {
    case "area_chart":
      return <AreaChartWidget widget={widget} />;
    case "bar_chart":
      return <BarChartWidget widget={widget} />;
    case "stat_number":
      return <StatNumberWidget widget={widget} />;
    case "resource_table":
      return <ResourceTableWidget widget={widget} />;
    case "child_list":
      return <ChildListWidget widget={widget} />;
    case "kanban":
      return <KanbanWidget widget={widget} />;
    default:
      return null;
  }
}

const GRID_COLS = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface DashboardRendererProps {
  widgets: WidgetRead[];
}

export function DashboardRenderer({ widgets }: DashboardRendererProps) {
  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-base font-medium text-foreground">Your dashboard is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the chat and ask the AI to add widgets, e.g. "Add a revenue chart for the last 90 days"
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(120px, auto)",
        gridAutoFlow: "dense",
      }}
    >
      {widgets.map((widget) => {
        const w = clamp(widget.size_w, 1, GRID_COLS);
        const h = clamp(widget.size_h, 1, 6);
        const colStart = clamp(widget.position_x + 1, 1, GRID_COLS - w + 1);
        return (
          <div
            key={widget.id}
            style={{
              gridColumn: `${colStart} / span ${w}`,
              gridRow: `span ${h}`,
            }}
          >
            <QueryBoundary
              resetKey={widget.id}
              fallback={<WidgetSkeleton cols={w} />}
              errorFallback={(_err, retry) => <DefaultWidgetError onRetry={retry} />}
            >
              <WidgetContent widget={widget} />
            </QueryBoundary>
          </div>
        );
      })}
    </div>
  );
}
