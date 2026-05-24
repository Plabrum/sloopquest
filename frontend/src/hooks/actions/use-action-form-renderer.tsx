import { useCallback } from "react";
import { getActionRenderer, type ActionType } from "@/lib/actions/registry";
import type { ActionFormRenderer } from "./use-action-executor";

/**
 * Bridges the typed action registry to the executor. objectData is opaque
 * here — the registry dispatches by string key, and each dialog narrows
 * the type internally.
 */
export function useActionFormRenderer(
  objectData?: unknown,
): ActionFormRenderer {
  return useCallback<ActionFormRenderer>(
    ({ action, onSubmit, onClose, isSubmitting, isOpen, actionLabel }) => {
      const actionType = action.action as ActionType;
      const render = getActionRenderer(actionType);

      if (!render) {
        return null;
      }

      return render({
        objectData,
        defaultValues: objectData,
        onSubmit: (data) => {
          onSubmit({
            action: actionType,
            data,
          } as Parameters<typeof onSubmit>[0]);
        },
        onClose,
        isSubmitting,
        isOpen,
        actionLabel,
      });
    },
    [objectData],
  );
}
