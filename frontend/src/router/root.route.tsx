import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/lib/theme";

export const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster richColors />
        <Outlet />
      </QueryClientProvider>
    </ThemeProvider>
  ),
});
