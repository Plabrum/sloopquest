import { cn } from "@/lib/utils"

interface DetailHeaderProps {
  avatar?: React.ReactNode
  title: string
  status?: React.ReactNode
  tags?: React.ReactNode
  subtitle?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function DetailHeader({
  avatar,
  title,
  status,
  tags,
  subtitle,
  meta,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-2xl border bg-card p-6 shadow-sm",
        className,
      )}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="truncate text-[22px] font-bold tracking-tight">
            {title}
          </h2>
          {status}
          {tags}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {meta && <div className="mt-1.5">{meta}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
