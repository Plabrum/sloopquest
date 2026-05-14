import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  Inbox,
  LayoutDashboard,
  Receipt,
  RefreshCw,
  Sailboat,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { GlobalSearch } from "@/components/global-search";

interface SubNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

type WorkspaceNavItem =
  | { title: string; url: string; icon: LucideIcon; children?: undefined }
  | { title: string; icon: LucideIcon; children: SubNavItem[]; url?: undefined };

const WORKSPACE_ITEMS: WorkspaceNavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Search", url: "/search", icon: Search },
  {
    title: "CRM",
    icon: Users,
    children: [
      { title: "Clients", url: "/crm/clients", icon: Users },
      { title: "Vessels", url: "/crm/vessels", icon: Sailboat },
      { title: "Quotes", url: "/crm/quotes", icon: FileText },
    ],
  },
  { title: "Surveys", url: "/surveys", icon: ClipboardList },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  {
    title: "Money",
    icon: DollarSign,
    children: [
      { title: "Invoices", url: "/money/invoices", icon: Receipt },
      { title: "Subscriptions", url: "/money/subscriptions", icon: RefreshCw },
    ],
  },
  { title: "Inbox", url: "/inbox", icon: Inbox },
];

function useIsActive(url: string) {
  return useRouterState({
    select: (s) => {
      const path = s.location.pathname;
      if (url === "/") return path === "/";
      if (path === url) return true;
      return path.startsWith(`${url}/`);
    },
  });
}

function useAnyChildActive(children: SubNavItem[]) {
  return useRouterState({
    select: (s) => {
      const path = s.location.pathname;
      return children.some(
        (c) => path === c.url || path.startsWith(`${c.url}/`),
      );
    },
  });
}

function SubNavLink({ item }: { item: SubNavItem }) {
  const isActive = useIsActive(item.url);
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isActive}>
        <Link to={item.url}>
          <item.icon className={cn("size-4", isActive ? "opacity-100" : "opacity-60")} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function WorkspaceLeafLink({
  item,
}: {
  item: Extract<WorkspaceNavItem, { url: string }>;
}) {
  const isActive = useIsActive(item.url);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} className="h-9">
        <Link to={item.url}>
          <item.icon className={cn("size-5", isActive ? "opacity-100" : "opacity-70")} />
          <span className="font-medium group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function WorkspaceGroup({
  item,
}: {
  item: Extract<WorkspaceNavItem, { children: SubNavItem[] }>;
}) {
  const expanded = useAnyChildActive(item.children);
  const firstChildUrl = item.children[0].url;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} isActive={expanded} className="h-9">
        <Link to={firstChildUrl}>
          <item.icon className={cn("size-5", expanded ? "opacity-100" : "opacity-70")} />
          <span className="font-medium group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
      {expanded && (
        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
          {item.children.map((child) => (
            <SubNavLink key={child.url} item={child} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

function WorkspaceNavLink({ item }: { item: WorkspaceNavItem }) {
  if (item.children) {
    return <WorkspaceGroup item={item} />;
  }
  return <WorkspaceLeafLink item={item} />;
}

export function AppSidebar({ user }: { user: { email?: string; name?: string } }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center justify-center overflow-hidden group-data-[collapsible=icon]:px-0">
        <span
          style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
          className="hidden group-data-[collapsible=icon]:block text-2xl font-semibold leading-none"
        >
          SQ
        </span>
        <div className="flex flex-col items-center leading-none group-data-[collapsible=icon]:hidden">
          <span
            style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.04em" }}
            className="font-semibold text-[1.35rem] leading-tight"
          >
            Sloopquest
          </span>
          <span
            style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.1em" }}
            className="text-[0.6rem] font-medium text-muted-foreground uppercase mt-0.5"
          >
            Marine Survey
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="border-t border-sidebar-border/50 mx-4" />
        <SidebarMenu className="px-2 pt-2 group-data-[collapsible=icon]:px-0">
          {WORKSPACE_ITEMS.map((item) => (
            <WorkspaceNavLink key={item.url ?? item.title} item={item} />
          ))}
        </SidebarMenu>
        <div className="mt-auto px-2 group-data-[collapsible=icon]:px-0">
          <div className="border-t border-sidebar-border/50 mx-2 mb-2" />
          <SidebarMenu>
            <WorkspaceNavLink item={{ title: "Settings", url: "/settings", icon: Settings }} />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
      <GlobalSearch />
    </Sidebar>
  );
}
