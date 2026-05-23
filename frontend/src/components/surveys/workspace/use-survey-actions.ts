import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";

export type SurveyActions = {
  invalidate: () => Promise<unknown>;
  saveField: (node: FormNodeRef, value: unknown) => Promise<void>;
  assignMedia: (mediaId: string, nodeId: string | null) => Promise<void>;
  addRepeaterInstance: (nodeId: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
};

export function useSurveyActions(surveyId: string): SurveyActions {
  const queryClient = useQueryClient();
  const { mutateAsync: execute } = useActionsActionGroupObjectIdExecuteObjectAction();

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          String(q.queryKey[0] ?? "").startsWith(`/surveys/${surveyId}`) ||
          String(q.queryKey[0] ?? "").startsWith("/survey-media"),
      }),
    [surveyId, queryClient],
  );

  const saveField = useCallback(
    async (node: FormNodeRef, value: unknown) => {
      await execute({
        actionGroup: "form_node_actions",
        objectId: node.id,
        data: { action: "form_node_actions__update_value", data: { value } } as never,
      });
      await invalidate();
    },
    [execute, invalidate],
  );

  const assignMedia = useCallback(
    async (mediaId: string, nodeId: string | null) => {
      await execute({
        actionGroup: "survey_media_actions",
        objectId: mediaId,
        data: {
          action: "survey_media_actions__assign",
          data: { node_id: nodeId },
        } as never,
      });
      await invalidate();
    },
    [execute, invalidate],
  );

  const addRepeaterInstance = useCallback(
    async (nodeId: string) => {
      await execute({
        actionGroup: "form_node_actions",
        objectId: nodeId,
        data: { action: "form_node_actions__add_repeater_instance", data: {} } as never,
      });
      await invalidate();
    },
    [execute, invalidate],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      await execute({
        actionGroup: "form_node_actions",
        objectId: nodeId,
        data: { action: "form_node_actions__delete", data: {} } as never,
      });
      await invalidate();
    },
    [execute, invalidate],
  );

  return useMemo(
    () => ({ invalidate, saveField, assignMedia, addRepeaterInstance, deleteNode }),
    [invalidate, saveField, assignMedia, addRepeaterInstance, deleteNode],
  );
}
