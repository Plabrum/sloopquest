import { Suspense } from "react"
import { Link } from "@tanstack/react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"

export interface BreadcrumbSegment {
  label: string
  href?: string
}

interface PageTopBarProps {
  title: string
  breadcrumbSegments?: BreadcrumbSegment[]
  actions?: React.ReactNode
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PageTopBar({
  title,
  breadcrumbSegments,
  actions,
  fallback,
  children,
}: PageTopBarProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbSegments?.map((segment) => (
                <span key={segment.label} className="contents">
                  <BreadcrumbItem>
                    {segment.href ? (
                      <BreadcrumbLink asChild>
                        <Link
                          to={segment.href}
                          className="text-sm font-medium text-sidebar-foreground/60"
                        >
                          {segment.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-sm font-medium text-sidebar-foreground/60">
                        {segment.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-sidebar-foreground/30" />
                </span>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-bold text-sidebar-foreground">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <Suspense fallback={fallback ?? <PageSkeleton />}>{children}</Suspense>
    </>
  )
}
