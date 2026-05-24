import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { SurveyWorkspace } from "@/components/surveys/workspace/survey-workspace";
import { useSurveysIdDetailHandlerSuspense } from "@/openapi/survey/survey";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function SurveyDetailContent() {
  const { surveyId } = useParams({ from: "/_authenticated/surveys/$surveyId" });
  const { data } = useSurveysIdDetailHandlerSuspense(surveyId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("survey_actions", surveyId);

  return (
    <PageTopBar
      title={data.vessel?.label ?? "Survey"}
      state={data.state}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="survey_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <SurveyWorkspace data={data} />
    </PageTopBar>
  );
}

export function SurveyDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Survey">
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
