import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurveyTemplatesIdDetailHandlerSuspense } from "@/openapi/survey-templates/survey-templates";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function SurveyTemplateDetailContent() {
  const { templateId } = useParams({ from: "/_authenticated/survey-templates/$templateId" });
  const { data } = useSurveyTemplatesIdDetailHandlerSuspense(templateId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("survey_template_actions", templateId);

  return (
    <PageTopBar
      title={data.name}
      breadcrumbSegments={[{ label: "Survey Templates", href: "/survey-templates" }]}
      actions={
        <ActionsMenu
          actions={actionsData?.actions ?? []}
          actionGroup="survey_template_actions"
          objectId={templateId}
          objectData={data}
          onActionComplete={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: "Name", value: data.name },
            { label: "Tags", value: data.tags.join(", ") || "—" },
          ]}
        />
      </div>
    </PageTopBar>
  );
}

export function SurveyTemplateDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar
          title="Survey Template"
          breadcrumbSegments={[{ label: "Survey Templates", href: "/survey-templates" }]}
        >
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <SurveyTemplateDetailContent />
    </Suspense>
  );
}
