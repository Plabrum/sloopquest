import { cn } from "@/lib/utils"

interface KeyValueItem {
  label: string
  value: React.ReactNode
  span?: 1 | 2
}

interface KeyValueGridProps {
  items: KeyValueItem[]
  columns?: 2 | 3
  className?: string
}

function groupIntoRows(items: KeyValueItem[], columns: number) {
  const rows: KeyValueItem[][] = []
  let current: KeyValueItem[] = []
  let used = 0

  for (const item of items) {
    const span = item.span === 2 ? columns : 1
    if (used + span > columns && current.length > 0) {
      rows.push(current)
      current = []
      used = 0
    }
    current.push(item)
    used += span
    if (used >= columns) {
      rows.push(current)
      current = []
      used = 0
    }
  }
  if (current.length > 0) rows.push(current)
  return rows
}

export function KeyValueGrid({
  items,
  columns = 2,
  className,
}: KeyValueGridProps) {
  const rows = groupIntoRows(items, columns)

  return (
    <dl className={cn("flex flex-col", className)}>
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-6 rounded-lg px-3.5 py-2.5",
            i % 2 === 0 && "bg-muted/50",
          )}
        >
          {row.map((item) => (
            <div
              key={item.label}
              className={cn(
                "min-w-0 space-y-0.5",
                item.span === 2 ? "flex-[2]" : "flex-1",
              )}
            >
              <dt className="text-xs font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm">{item.value ?? "—"}</dd>
            </div>
          ))}
        </div>
      ))}
    </dl>
  )
}
