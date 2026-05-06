import { useNavigate, useLocation } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface TabDefinition {
  label: string
  path: string
  badge?: string | number
}

interface TabLayoutProps {
  tabs: TabDefinition[]
  basePath: string
  children: React.ReactNode
  className?: string
}

export function TabLayout({
  tabs,
  basePath,
  children,
  className,
}: TabLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <nav
        className="flex h-12 overflow-x-auto border-b"
        role="tablist"
      >
        {tabs.map((tab) => {
          const href = tab.path ? `${basePath}/${tab.path}` : basePath
          const isActive = tab.path
            ? location.pathname.startsWith(href)
            : location.pathname === basePath ||
              location.pathname === `${basePath}/`

          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => navigate({ to: href })}
              className={cn(
                "flex h-full items-center justify-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActive &&
                  "border-b-2 border-primary font-semibold text-primary hover:text-primary",
              )}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="flex flex-col gap-4 bg-muted/30 p-6">{children}</div>
    </div>
  )
}
