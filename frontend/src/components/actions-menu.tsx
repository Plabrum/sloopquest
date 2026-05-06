import { MoreHorizontal } from "lucide-react";
import { ActionConfirmationDialog } from "@/components/actions/action-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionExecutor } from "@/hooks/use-action-executor";
import { useActionFormRenderer } from "@/hooks/use-action-form-renderer";
import type {
  ActionDTO,
  ActionGroupType,
  ActionMutations,
} from "@/lib/actions/types";

interface ActionsMenuProps extends ActionMutations {
  actions: ActionDTO[];
  actionGroup: ActionGroupType;
  objectId?: string;
  onActionComplete?: () => void;
  /**
   * Object data passed through to form renderers for pre-populating edit
   * forms. unknown because the registry dispatches by string key — each
   * dialog narrows internally.
   */
  objectData?: unknown;
}

export function ActionsMenu({
  actions,
  actionGroup,
  objectId,
  onActionComplete,
  objectData,
  executeGroupActionMutation,
  executeObjectActionMutation,
}: ActionsMenuProps) {
  const formRenderer = useActionFormRenderer(objectData);

  const executor = useActionExecutor({
    actionGroup,
    objectId,
    renderActionForm: formRenderer,
    executeGroupActionMutation,
    executeObjectActionMutation,
    onSuccess: () => {
      onActionComplete?.();
    },
  });

  const availableActions = actions.filter(
    (action) => action.available !== false,
  );

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableActions
            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
            .map((action, index) => (
              <DropdownMenuItem
                key={`${action.action}-${index}`}
                onClick={() => executor.initiateAction(action)}
                className="cursor-pointer"
              >
                {action.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ActionConfirmationDialog
        open={executor.showConfirmation}
        action={executor.pendingAction}
        isExecuting={executor.isExecuting}
        onConfirm={executor.confirmAction}
        onCancel={executor.cancelAction}
      />

      {executor.pendingAction &&
        executor.renderActionForm &&
        executor.renderActionForm({
          action: executor.pendingAction,
          onSubmit: executor.executeWithData,
          onClose: executor.cancelAction,
          isSubmitting: executor.isExecuting,
          isOpen: executor.showForm,
          actionLabel: executor.pendingAction.label,
        })}
    </>
  );
}
