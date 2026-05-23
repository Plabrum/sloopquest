import { Suspense, useEffect } from "react"
import { Link, useRouterState } from "@tanstack/react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StatusBadge } from "@/components/status-badge"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useBreadcrumbTrail } from "@/stores/breadcrumb-trail"

interface PageTopBarProps {
  title: string
  state?: string | null
  actions?: React.ReactNode
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PageTopBar({ title, state, actions, fallback, children }: PageTopBarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const push = useBreadcrumbTrail((s) => s.push)
  const trail = useBreadcrumbTrail((s) => s.trail)

  useEffect(() => {
    push({ url: pathname, label: title })
  }, [pathname, title, push])

  const displayTrail =
    trail.length > 0 && trail[trail.length - 1].url === pathname
      ? trail
      : [...trail, { url: pathname, label: title }]

  const head = displayTrail.slice(0, -1)
  const current = displayTrail[displayTrail.length - 1]

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground" />
          <Breadcrumb>
            <BreadcrumbList>
              {head.map((segment) => (
                <span key={segment.url} className="contents">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to={segment.url}
                        className="text-sm font-medium text-sidebar-foreground/60"
                      >
                        {segment.label}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-sidebar-foreground/30" />
                </span>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-bold text-sidebar-foreground">
                  {current.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {state ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <StatusBadge status={state} tone="solid" showDot={false} />
          </div>
        ) : null}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <Suspense fallback={fallback ?? <PageSkeleton />}>{children}</Suspense>
    </>
  )
}
