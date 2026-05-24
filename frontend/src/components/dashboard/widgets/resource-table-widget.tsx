import type { WidgetRead } from "../types";
import { useResourceList } from "../data-sources";

export function ResourceTableWidget({ widget }: { widget: WidgetRead }) {
  const { data } = useResourceList(
    widget.query.resource,
    widget.query.filters,
    widget.query.limit ?? 10,
  );

  const items = data.items ?? [];
  const cols = widget.query.columns ?? [];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {widget.title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border">
                {cols.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={String(item.id ?? i)}
                  className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30"
                >
                  {cols.map((col) => (
                    <td key={col} className="px-4 py-2 text-xs tabular-nums text-foreground">
                      {String(item[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
