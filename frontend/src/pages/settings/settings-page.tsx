import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSurveyTemplate } from "@/openapi/survey-templates/survey-templates";
import { surveyTemplateColumnDefs } from "@/openapi/survey-templates/columns.gen";
import { useListPricingGuide } from "@/openapi/pricing-guides/pricing-guides";
import { pricingGuideColumnDefs } from "@/openapi/pricing_guides/columns.gen";
import { useTheme } from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "almanac", label: "Almanac" },
  { value: "shad", label: "Default" },
  { value: "glass", label: "Glass" },
  { value: "angular", label: "Angular" },
] as const;

const COLOR_MODE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

function AppearanceTab() {
  const { theme, setTheme, colorMode, setColorMode } = useTheme();

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <SelectTrigger id="theme" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Switch the overall visual style of the app.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color-mode">Color mode</Label>
        <Select
          value={colorMode}
          onValueChange={(v) => setColorMode(v as typeof colorMode)}
        >
          <SelectTrigger id="color-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SurveyTemplatesTab() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListSurveyTemplate,
    columns: surveyTemplateColumnDefs,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Survey Templates</h2>
          <p className="text-sm text-muted-foreground">
            Reusable inspection forms surveyors fill out in the field.
          </p>
        </div>
        <Suspense>
          <TopLevelActions actionGroup="survey_template_actions" />
        </Suspense>
      </div>
      <ResourceTable
        {...tableProps}
        columns={surveyTemplateColumnDefs}
        onRowClick={(row) =>
          navigate({
            to: "/survey-templates/$templateId",
            params: { templateId: String(row.id) },
          })
        }
      />
    </div>
  );
}

function PricingGuidesTab() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListPricingGuide,
    columns: pricingGuideColumnDefs,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Pricing Guides</h2>
          <p className="text-sm text-muted-foreground">
            Fee schedules used when generating quotes.
          </p>
        </div>
        <Suspense>
          <TopLevelActions actionGroup="pricing_guide_actions" />
        </Suspense>
      </div>
      <ResourceTable
        {...tableProps}
        columns={pricingGuideColumnDefs}
        onRowClick={(row) =>
          navigate({
            to: "/pricing-guides/$guideId",
            params: { guideId: String(row.id) },
          })
        }
      />
    </div>
  );
}

export function SettingsPage() {
  return (
    <PageTopBar title="Settings">
      <div className="p-6">
        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="pricing-guides">Pricing Guides</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="pt-6">
            <p className="text-sm text-muted-foreground">
              Account settings coming soon.
            </p>
          </TabsContent>
          <TabsContent value="appearance" className="pt-6">
            <AppearanceTab />
          </TabsContent>
          <TabsContent value="templates" className="pt-6">
            <SurveyTemplatesTab />
          </TabsContent>
          <TabsContent value="pricing-guides" className="pt-6">
            <PricingGuidesTab />
          </TabsContent>
          <TabsContent value="notifications" className="pt-6">
            <p className="text-sm text-muted-foreground">
              Notification settings coming soon.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </PageTopBar>
  );
}
