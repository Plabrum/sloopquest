import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface TwoColumnLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  sidebarPosition?: "left" | "right"
  collapsible?: boolean
  defaultCollapsed?: boolean
  sidebarWidth?: string
  className?: string
}

export function TwoColumnLayout({
  children,
  sidebar,
  sidebarPosition = "right",
  collapsible = false,
  defaultCollapsed = false,
  sidebarWidth = "480px",
  className,
}: TwoColumnLayoutProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const main = <div className="min-w-0 flex-1">{children}</div>

  const toggleIcon =
    sidebarPosition === "right"
      ? collapsed
        ? ChevronLeft
        : ChevronRight
      : collapsed
        ? ChevronRight
        : ChevronLeft
  const ToggleIcon = toggleIcon

  const side = (
    <div
      className={cn(
        "relative w-full shrink-0 transition-all",
        collapsed ? "lg:w-0 lg:overflow-hidden" : "lg:w-[var(--sidebar-w)]",
      )}
      style={{ ["--sidebar-w" as string]: sidebarWidth }}
    >
      {!collapsed && sidebar}
    </div>
  )

  const toggle = collapsible ? (
    <button
      type="button"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => setCollapsed((c) => !c)}
      className="hidden h-8 w-6 shrink-0 items-center justify-center self-start rounded-md border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:flex"
    >
      <ToggleIcon className="h-4 w-4" />
    </button>
  ) : null

  return (
    <div className={cn("flex flex-col gap-5 lg:flex-row", className)}>
      {sidebarPosition === "left" ? (
        <>
          {side}
          {toggle}
          {main}
        </>
      ) : (
        <>
          {main}
          {toggle}
          {side}
        </>
      )}
    </div>
  )
}
