import { cn } from "@/lib/utils";

export interface ChartLegendItem {
  label: string;
  color: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pt-2 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-[2px]"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
