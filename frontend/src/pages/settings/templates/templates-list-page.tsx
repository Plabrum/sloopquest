import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSurveyTemplate } from "@/openapi/survey-templates/survey-templates";
import { surveyTemplateColumnDefs } from "@/openapi/survey-templates/columns.gen";

export function TemplatesListPage() {
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
            to: "/settings/templates/$templateId",
            params: { templateId: String(row.id) },
          })
        }
      />
    </div>
  );
}
