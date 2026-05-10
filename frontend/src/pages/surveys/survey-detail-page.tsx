import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { useSurveysIdDetailHandlerSuspense } from "@/openapi/survey/survey";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function SurveyDetailContent() {
  const { surveyId } = useParams({ from: "/_authenticated/surveys/$surveyId" });
  const { data } = useSurveysIdDetailHandlerSuspense(surveyId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("survey_actions", surveyId);

  return (
    <PageTopBar
      title={`Survey — ${data.state}`}
      breadcrumbSegments={[{ label: "Surveys", href: "/surveys" }]}
      actions={
        <div className="flex items-center gap-2">
          <TopLevelActions
            actionGroup="invoice_actions"
            formContext={{ survey_id: surveyId }}
            maxVisible={1}
          />
          <ActionsMenu
            actions={actionsData?.actions ?? []}
            actionGroup="survey_actions"
            objectId={surveyId}
            objectData={data}
            onActionComplete={() => refetchActions()}
          />
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <KeyValueGrid
          items={[
            { label: "State", value: data.state },
            { label: "Vessel ID", value: data.vessel_id },
            { label: "Surveyor ID", value: data.assigned_surveyor_id },
          ]}
        />
        {data.template_id && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <DynamicFormRenderer
              surveyId={surveyId}
              templateId={data.template_id}
              existingResponse={data.form_response ?? null}
            />
          </Suspense>
        )}
      </div>
    </PageTopBar>
  );
}

export function SurveyDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Survey" breadcrumbSegments={[{ label: "Surveys", href: "/surveys" }]}>
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <SurveyDetailContent />
    </Suspense>
  );
}
