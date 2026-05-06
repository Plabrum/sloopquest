import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Sailboat,
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Surveys", url: "/surveys", icon: ClipboardList },
  { title: "Vessels", url: "/vessels", icon: Sailboat },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
];

function NavLink({ item }: { item: NavItem }) {
  // Match exact path or genuine child segment so siblings like `/me` and
  // `/messages` don't both light up under the naive startsWith check.
  const isActive = useRouterState({
    select: (s) => {
      const path = s.location.pathname;
      if (item.url === "/") return path === "/";
      if (path === item.url) return true;
      return path.startsWith(`${item.url}/`);
    },
  });

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

export function AppSidebar({ user }: { user: { email?: string; name?: string } }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center px-3 gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Anchor className="size-6 shrink-0 text-sidebar-primary" />
        <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
          Sloopquest
        </span>
      </SidebarHeader>
      <SidebarContent>
        <div className="border-t border-sidebar-border/50 mx-4" />
        <SidebarMenu className="px-2 pt-2 group-data-[collapsible=icon]:px-0">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.title} item={item} />
          ))}
        </SidebarMenu>
        <div className="mt-auto px-2 group-data-[collapsible=icon]:px-0">
          <div className="border-t border-sidebar-border/50 mx-2 mb-2" />
          <SidebarMenu>
            <NavLink item={{ title: "Settings", url: "/settings", icon: Settings }} />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
