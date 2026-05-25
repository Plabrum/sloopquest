import {
  Outlet,
  useMatches,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "/settings/account", label: "Account" },
  { value: "/settings/appearance", label: "Appearance" },
  { value: "/settings/templates", label: "Templates" },
  { value: "/settings/pricing-guides", label: "Pricing Guides" },
  { value: "/settings/notifications", label: "Notifications" },
] as const;

function activeTabFromPath(pathname: string): string {
  const match = TABS.find((t) => pathname.startsWith(t.value));
  return match?.value ?? "/settings/account";
}

function SettingsTabsNav({ active }: { active: string }) {
  const navigate = useNavigate();
  return (
    <Tabs
      value={active}
      onValueChange={(value) => navigate({ to: value })}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function SettingsShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matches = useMatches();
  const isDetail = matches.some(
    (m) => typeof m.staticData?.crumb === "function",
  );
  const activeTab = activeTabFromPath(pathname);

  if (isDetail) {
    return <Outlet />;
  }
  return (
    <PageTopBar>
      <div className="p-6">
        <SettingsTabsNav active={activeTab} />
        <div className="pt-6">
          <Outlet />
        </div>
      </div>
    </PageTopBar>
  );
}
