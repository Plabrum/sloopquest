import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-8 shadow-sm",
        className,
      )}
    >
      {icon && (
        <div className="text-muted-foreground/40 [&>svg]:h-12 [&>svg]:w-12">
          {icon}
        </div>
      )}
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-[250px] text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
