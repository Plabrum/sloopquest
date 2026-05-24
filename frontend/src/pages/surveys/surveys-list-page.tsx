import { Suspense, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceKanban } from "@/components/kanban/resource-kanban";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSurvey } from "@/openapi/survey/survey";
import { surveyColumnDefs } from "@/openapi/survey/columns.gen";

type View = "table" | "kanban";

export function SurveysListPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("table");
  const { tableProps } = useResourceTable({ listQuery: useListSurvey, columns: surveyColumnDefs });

  return (
    <PageTopBar
      title="Surveys"
      actions={
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
          <Suspense>
            <TopLevelActions actionGroup="survey_actions" />
          </Suspense>
        </div>
      }
    >
      <div className="h-full p-6">
        {view === "table" ? (
          <ResourceTable
            {...tableProps}
            columns={surveyColumnDefs}
            onRowClick={(row) => navigate({ to: "/surveys/$surveyId", params: { surveyId: String(row.id) } })}
          />
        ) : (
          <Suspense>
            <ResourceKanban resource="surveys" cardColumns={["vessel", "surveyor", "state"]} />
          </Suspense>
        )}
      </div>
    </PageTopBar>
  );
}
