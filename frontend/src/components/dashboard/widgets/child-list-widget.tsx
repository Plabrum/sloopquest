import type { WidgetRead } from "../types";
import { getPrimaryColumn, getSubColumn, useResourceList } from "../data-sources";

export function ChildListWidget({ widget }: { widget: WidgetRead }) {
  const { data } = useResourceList(
    widget.query.resource,
    widget.query.filters,
    widget.query.limit ?? 10,
  );

  const items = data.items ?? [];
  const primary = getPrimaryColumn(widget.query.resource);
  const sub = getSubColumn(widget.query.resource);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {widget.title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No items</p>
      ) : (
        <div className="divide-y divide-border/40 border-t border-border">
          {items.map((item, i) => (
            <div
              key={String(item.id ?? i)}
              className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="truncate text-sm">{primary.render(item)}</div>
              {sub && item[sub.key] != null && (
                <div className="ml-3 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {sub.render(item)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
