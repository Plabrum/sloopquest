import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { customInstance } from "@/openapi/custom-instance";
import { getInitials } from "@/lib/format";

interface NavUserProps {
  user: { email?: string; name?: string };
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Clear the React Query cache on logout — server-side session is terminated
  // either way, so don't leave authenticated data in memory if the request fails.
  const logout = useMutation({
    mutationFn: () =>
      customInstance<{ message?: string }>({ url: "/auth/logout", method: "POST" }),
    onSettled: () => {
      queryClient.clear();
      void navigate({ to: "/auth", replace: true, search: {} });
    },
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                {user.name && (
                  <span className="truncate font-bold text-sm">{user.name}</span>
                )}
                {user.email && (
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {user.email}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-0 group-data-[state=open]:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  {user.name && (
                    <span className="truncate font-bold">{user.name}</span>
                  )}
                  {user.email && (
                    <span className="truncate text-xs">{user.email}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout.mutate()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
