import { useLocation, Link } from "@tanstack/react-router";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  surveys: "Surveys",
  vessels: "Vessels",
  clients: "Clients",
  reports: "Reports",
  settings: "Settings",
};

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  currentPageTitle?: string;
  /** Additional breadcrumb segments between the root and the current page */
  segments?: BreadcrumbSegment[];
}

export function Breadcrumb({ currentPageTitle, segments }: BreadcrumbProps) {
  const { pathname } = useLocation();
  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  const currentLabel =
    currentPageTitle ??
    routeLabels[lastSegment] ??
    (/^\d+$/.test(lastSegment) ? null : lastSegment);

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="text-sm font-semibold text-sidebar-foreground/60">
              Sloopquest
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments?.map((segment) => (
          <span key={segment.label} className="contents">
            <BreadcrumbSeparator className="text-sidebar-foreground/30" />
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
          </span>
        ))}
        {currentLabel && (
          <>
            <BreadcrumbSeparator className="text-sidebar-foreground/30" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-bold text-sidebar-foreground">
                {currentLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
