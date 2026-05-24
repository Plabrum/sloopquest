import { cn } from "@/lib/utils";

interface ChildObjectListProps<T extends { id: string | number }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

/**
 * Compact list for child objects within a detail page section.
 * Pair with `useChildObjectList` hook for data fetching and wrap in
 * `<DetailSection>` for the section header, badge, and actions.
 */
export function ChildObjectList<T extends { id: string | number }>({
  items,
  renderItem,
  emptyMessage = "No items",
  loading,
  className,
}: ChildObjectListProps<T>) {
  if (items.length === 0 && !loading) {
    return (
      <p
        className={cn(
          "py-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "-mx-6 -mb-5 flex flex-col gap-2 px-3 pb-2 pt-0 transition-opacity",
        loading && "opacity-60",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "rounded-[14px]",
            i % 2 === 0 && "bg-primary/[0.07]",
          )}
        >
          {renderItem(item)}
        </div>
      ))}
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
        onClick && "cursor-pointer transition-colors hover:bg-accent/50",
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
