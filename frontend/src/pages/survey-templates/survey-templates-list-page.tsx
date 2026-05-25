import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSurveyTemplate } from "@/openapi/survey-templates/survey-templates";
import { surveyTemplateColumnDefs } from "@/openapi/survey-templates/columns.gen";

export function SurveyTemplatesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListSurveyTemplate, columns: surveyTemplateColumnDefs });

  return (
    <PageTopBar
      title="Survey Templates"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="survey_template_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={surveyTemplateColumnDefs}
          onRowClick={(row) =>
            navigate({ to: "/settings/templates/$templateId", params: { templateId: String(row.id) } })
          }
        />
      </div>
    </PageTopBar>
  );
}
