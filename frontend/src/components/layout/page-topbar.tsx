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
import { usePageSubcrumb } from "@/stores/page-subcrumb"

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
  const subcrumb = usePageSubcrumb((s) => s.label)

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
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground" />
          <Breadcrumb>
            <BreadcrumbList>
              {head.map((segment) => (
                <span key={segment.url} className="contents">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={segment.url}>{segment.label}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                </span>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage>{current.label}</BreadcrumbPage>
              </BreadcrumbItem>
              {subcrumb ? (
                <>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <span data-slot="breadcrumb-subcrumb" aria-current="page">
                      {subcrumb}
                    </span>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          {state ? (
            <StatusBadge status={state} tone="subtle" />
          ) : null}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <Suspense fallback={fallback ?? <PageSkeleton />}>{children}</Suspense>
    </>
  )
}
