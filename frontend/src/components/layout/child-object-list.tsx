import { cn } from "@/lib/utils";

interface ChildObjectListProps<T extends { id: string | number }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  title?: React.ReactNode;
  /** A count number or a custom ReactNode (e.g. a status pill). */
  badge?: React.ReactNode;
  /** Header-level actions (e.g. an "Add X" button). */
  topLevelActions?: React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function ChildObjectList<T extends { id: string | number }>({
  items,
  renderItem,
  title,
  badge,
  topLevelActions,
  emptyMessage = "No items",
  loading,
  className,
}: ChildObjectListProps<T>) {
  const hasHeader = title != null || badge != null || topLevelActions != null;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border/30 bg-card",
        loading && "opacity-60",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2.5">
            {title != null && (
              <h3 className="text-base font-semibold">{title}</h3>
            )}
            {badge != null &&
              (typeof badge === "object" ? (
                badge
              ) : (
                <span className="inline-flex items-center justify-center rounded-lg bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {badge}
                </span>
              ))}
          </div>
          {topLevelActions && (
            <div className="flex items-center gap-2">{topLevelActions}</div>
          )}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div
          className={cn(
            "px-5 py-8 text-center text-sm text-muted-foreground",
            hasHeader && "border-t border-border/30",
          )}
        >
          {emptyMessage}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col",
            hasHeader && "border-t border-border/30",
          )}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              className={cn(
                i > 0 && "border-t border-border/30",
                "transition-colors even:bg-primary/[0.04]",
              )}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChildObjectRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ChildObjectRow({
  title,
  subtitle,
  status,
  actions,
  onClick,
  className,
}: ChildObjectRowProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 px-5 py-3",
        onClick && "cursor-pointer transition-colors hover:bg-primary/[0.06]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {status && <div className="shrink-0">{status}</div>}
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
