import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { StateMachineKanban } from "@/components/kanban/state-machine-kanban";
import { StatusBadge } from "@/components/status-badge";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import {
  getListSurveyQueryKey,
  useListSurveySuspense,
} from "@/openapi/survey/survey";
import { SurveyState, type SurveyListItem } from "@/openapi/litestarAPI.schemas";

const SURVEY_STATES = [
  SurveyState.scheduled,
  SurveyState.in_draft,
  SurveyState.delivered,
  SurveyState.cancelled,
] as const;

export function SurveyKanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listRequest = { limit: 200, offset: 0 };
  const { data } = useListSurveySuspense(listRequest);
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();

  const queryKey = getListSurveyQueryKey(listRequest);

  return (
    <StateMachineKanban<SurveyListItem, SurveyState>
      rows={data.items}
      getId={(s) => s.id}
      getName={(s) => s.vessel.label}
      getState={(s) => s.state}
      renderCard={(s) => (
        <button
          type="button"
          className="hover:bg-accent/50 -m-1.5 w-full cursor-pointer space-y-1 rounded-md p-1.5 text-left transition-colors"
          onClick={() =>
            navigate({
              to: "/surveys/$surveyId",
              params: { surveyId: String(s.id) },
            })
          }
        >
          <div className="text-sm font-medium">{s.vessel.label}</div>
          <div className="text-muted-foreground text-xs">
            {s.surveyor.label}
          </div>
          <div className="pt-1">
            <StatusBadge status={s.state} />
          </div>
        </button>
      )}
      states={SURVEY_STATES}
      actionGroup="survey_actions"
      executeAction={({ actionGroup, objectId, action }) =>
        execute.mutateAsync({
          actionGroup,
          objectId,
          // The discriminated union expects a literal action key. At runtime
          // the kanban always passes one that came from the row's action list,
          // so the cast is safe.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { action, data: {} } as any,
        })
      }
      onOptimisticMove={(rowId, toState) => {
        queryClient.setQueryData(queryKey, (old: typeof data | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === rowId ? { ...item, state: toState } : item,
            ),
          };
        });
      }}
      onRollback={() => queryClient.invalidateQueries({ queryKey })}
      onSettled={() => queryClient.invalidateQueries({ queryKey })}
    />
  );
}
