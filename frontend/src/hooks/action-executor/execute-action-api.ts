import type {
  ActionDTO,
  ActionExecutionResponse,
  ActionGroupType,
  ActionMutations,
} from "@/lib/actions/types";
import type { ActionBodyUnion } from "@/lib/actions/registry";

type ExecuteActionApiParams = ActionMutations & {
  action: ActionDTO;
  actionGroup: ActionGroupType;
  objectId?: string;
  actionBody?: ActionBodyUnion;
};

export async function executeActionApi({
  action,
  actionGroup,
  objectId,
  actionBody,
  executeGroupActionMutation,
  executeObjectActionMutation,
}: ExecuteActionApiParams): Promise<ActionExecutionResponse> {
  const requestBody =
    actionBody || ({ action: action.action, data: {} } as const);

  if (objectId) {
    return (await executeObjectActionMutation.mutateAsync({
      actionGroup,
      objectId,
      data: requestBody as ActionBodyUnion,
    })) as ActionExecutionResponse;
  } else {
    return (await executeGroupActionMutation.mutateAsync({
      actionGroup,
      data: requestBody as ActionBodyUnion,
    })) as ActionExecutionResponse;
  }
}
