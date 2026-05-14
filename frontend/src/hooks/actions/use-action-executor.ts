import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import {
  useActionsActionGroupExecuteAction,
  useActionsActionGroupObjectIdExecuteObjectAction,
} from "@/openapi/actions/actions";
import { executeActionApi } from "./action-executor/execute-action-api";
import { handleActionResult } from "./action-executor/handle-action-result";
import { handleQueryInvalidation } from "./action-executor/handle-query-invalidation";
import { preclaimClipboardFromActionResponse } from "./action-executor/preclaim-clipboard";
import type {
  ActionDTO,
  ActionExecutionResponse,
  ActionGroupType,
} from "@/lib/actions/types";
import type { ActionBodyUnion } from "@/lib/actions/registry";

export type ActionExecutorState = {
  isExecuting: boolean;
  pendingAction: ActionDTO | null;
  showConfirmation: boolean;
  showForm: boolean;
  error: string | null;
};

export type ActionFormRenderer = (props: {
  action: ActionDTO;
  onSubmit: (data: ActionBodyUnion) => void;
  onClose: () => void;
  isSubmitting: boolean;
  isOpen: boolean;
  actionLabel: string;
}) => React.ReactNode | null;

export type ActionExecutorOptions = {
  actionGroup: ActionGroupType;
  objectId?: string;
  onSuccess?: (action: ActionDTO, response: ActionExecutionResponse) => void;
  onError?: (action: ActionDTO, error: Error) => void;
  renderActionForm?: ActionFormRenderer;
  onInvalidate?: (
    queryClient: ReturnType<typeof useQueryClient>,
    backendQueryKeys: string[],
  ) => void;
  /** Context values merged into every action body (e.g. { survey_id: "..." }). */
  formContext?: Record<string, unknown>;
};

export function useActionExecutor({
  actionGroup,
  objectId,
  onSuccess,
  onError,
  renderActionForm,
  onInvalidate,
  formContext,
}: ActionExecutorOptions) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const executeGroupActionMutation = useActionsActionGroupExecuteAction();
  const executeObjectActionMutation = useActionsActionGroupObjectIdExecuteObjectAction();
  const [state, setState] = useState<ActionExecutorState>({
    isExecuting: false,
    pendingAction: null,
    showConfirmation: false,
    showForm: false,
    error: null,
  });

  async function executeAction(
    action: ActionDTO,
    actionBody?: ActionBodyUnion,
  ) {
    setState((prev) => ({ ...prev, isExecuting: true, error: null }));

    try {
      let finalBody = actionBody;
      if (formContext) {
        const existingData = finalBody
          ? (finalBody as { action: string; data: Record<string, unknown> }).data
          : {};
        finalBody = {
          action: finalBody
            ? (finalBody as { action: string }).action
            : action.action,
          data: { ...formContext, ...existingData },
        } as ActionBodyUnion;
      }

      const responsePromise = executeActionApi({
        action,
        actionGroup,
        objectId,
        actionBody: finalBody,
        executeGroupActionMutation,
        executeObjectActionMutation,
      });

      const clipboardClaimed =
        preclaimClipboardFromActionResponse(responsePromise);

      const response = await responsePromise;

      const resultHasOwnToast =
        response.action_result != null &&
        "type" in response.action_result &&
        response.action_result.type === "copy_to_clipboard" &&
        response.action_result.toast != null;

      if (!resultHasOwnToast) {
        toast.success(
          response.message || `${action.label} completed successfully`,
        );
      }

      handleQueryInvalidation(queryClient, response, onInvalidate);

      onSuccess?.(action, response);

      handleActionResult(response, navigate, { clipboardClaimed });

      setState({
        isExecuting: false,
        pendingAction: null,
        showConfirmation: false,
        showForm: false,
        error: null,
      });

      return response;
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        `Failed to execute ${action.label}`,
      );

      setState((prev) => ({
        ...prev,
        isExecuting: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      onError?.(action, err as Error);

      throw err;
    }
  }

  function hasCustomForm(action: ActionDTO): boolean {
    if (!renderActionForm) {
      return false;
    }
    return (
      renderActionForm({
        action,
        onSubmit: () => {},
        onClose: () => {},
        isSubmitting: false,
        isOpen: false,
        actionLabel: action.label,
      }) !== null
    );
  }

  function initiateAction(action: ActionDTO) {
    if (hasCustomForm(action)) {
      setState((prev) => ({
        ...prev,
        pendingAction: action,
        showForm: true,
      }));
      return;
    }

    if (action.confirmation_message) {
      setState((prev) => ({
        ...prev,
        pendingAction: action,
        showConfirmation: true,
      }));
      return;
    }

    executeAction(action).catch((err) => {
      console.error("Action execution failed:", err);
    });
  }

  function confirmAction() {
    if (state.pendingAction) {
      executeAction(state.pendingAction);
    }
  }

  function cancelAction() {
    setState({
      isExecuting: false,
      pendingAction: null,
      showConfirmation: false,
      showForm: false,
      error: null,
    });
  }

  function executeWithData(data: ActionBodyUnion) {
    if (state.pendingAction) {
      executeAction(state.pendingAction, data);
    }
  }

  return {
    ...state,
    initiateAction,
    confirmAction,
    cancelAction,
    executeWithData,
    executeAction,
    renderActionForm,
  };
}
