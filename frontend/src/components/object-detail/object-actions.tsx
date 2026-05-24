import {
  MoreHorizontal,
  Plus,
  Pencil,
  Check,
  X,
  RefreshCw,
  Download,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ActionConfirmationDialog } from "@/components/actions/action-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActionExecutor } from "@/hooks/actions/use-action-executor";
import { useActionFormRenderer } from "@/hooks/actions/use-action-form-renderer";
import type {
  ActionDTO,
  ObjectActionData,
  TopLevelActionData,
} from "@/lib/actions/types";

const ACTION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  add: Plus,
  edit: Pencil,
  check: Check,
  x: X,
  refresh: RefreshCw,
  download: Download,
};

type ObjectActionsProps = (ObjectActionData | TopLevelActionData) & {
    /** External edit-mode state (controlled by URL params). */
    editMode?: {
      isOpen: boolean;
      onOpen: () => void;
      onClose: () => void;
    };
    /** Visible buttons before overflow. Defaults to 2. */
    maxVisible?: number;
    /** When true, all visible buttons use the primary (default) variant. */
    allPrimary?: boolean;
    /** Custom trigger element for the overflow dropdown menu. */
    trigger?: React.ReactNode;
    /** Context values injected into form defaultValues for top-level actions. */
    formContext?: Record<string, unknown>;
  };

export function ObjectActions(props: ObjectActionsProps) {
  const isObjectAction = "data" in props;
  const navigate = useNavigate();

  const actionGroup = props.actionGroup;
  const onActionComplete = props.onActionComplete;

  const objectId = isObjectAction ? String(props.data.id) : undefined;
  const actions = isObjectAction
    ? (props.data.actions ?? [])
    : (props.actions ?? []);
  const objectData = isObjectAction
    ? props.data
    : (props.formContext ?? undefined);

  const formRenderer = useActionFormRenderer(objectData);

  const executor = useActionExecutor({
    actionGroup,
    objectId,
    renderActionForm: formRenderer,
    formContext: !isObjectAction ? props.formContext : undefined,
    onInvalidate:
      isObjectAction && props.onRefetch
        ? () => props.onRefetch?.()
        : !isObjectAction && props.onInvalidate
          ? () => props.onInvalidate?.()
          : undefined,
    onSuccess: (action, response) => {
      onActionComplete?.(action, response);
    },
  });

  const availableActions = actions.filter(
    (action: ActionDTO) => action.available !== false,
  );

  if (availableActions.length === 0) {
    return null;
  }

  const sortedActions = availableActions.sort(
    (a: ActionDTO, b: ActionDTO) => (a.priority || 0) - (b.priority || 0),
  );
  const maxVisible = props.maxVisible ?? 1;
  const visibleActions = sortedActions.slice(0, maxVisible);
  const remainingActions = sortedActions.slice(maxVisible);

  const isEditModeAction = (action: ActionDTO) =>
    action.action.endsWith("__edit");

  const editAction = availableActions.find(isEditModeAction);

  const handleActionClick = (action: ActionDTO) => {
    if (action.disabled_reason?.cta) {
      navigate({ to: action.disabled_reason.cta.path });
      return;
    }
    if (action.disabled_reason) {
      return;
    }
    if (isEditModeAction(action) && props.editMode) {
      if (props.editMode.isOpen) {
        props.editMode.onClose();
      } else {
        props.editMode.onOpen();
      }
    } else {
      executor.initiateAction(action);
    }
  };

  const getActionLabel = (action: ActionDTO) => {
    if (isEditModeAction(action) && props.editMode?.isOpen) {
      return "Finish editing";
    }
    return action.label;
  };

  const formAction =
    props.editMode?.isOpen && editAction ? editAction : executor.pendingAction;
  const formIsOpen =
    props.editMode?.isOpen && editAction
      ? props.editMode.isOpen
      : executor.showForm;
  const formOnClose =
    props.editMode?.isOpen && editAction
      ? props.editMode.onClose
      : executor.cancelAction;

  // Custom trigger + single action: skip the dropdown.
  const singleDirectAction =
    props.trigger && sortedActions.length === 1 ? sortedActions[0] : null;

  return (
    <>
      <div className="flex items-center gap-2">
        {visibleActions.map((action: ActionDTO, index: number) => {
          const button = (
            <Button
              key={action.action}
              variant={index === 0 || props.allPrimary ? "default" : "outline"}
              size="sm"
              onClick={() => handleActionClick(action)}
              aria-disabled={!!action.disabled_reason}
              className={
                "hidden md:inline-flex" +
                (action.disabled_reason ? " opacity-50" : "")
              }
            >
              {action.icon &&
                ACTION_ICONS[action.icon] &&
                (() => {
                  const Icon = ACTION_ICONS[action.icon!];
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
              {getActionLabel(action)}
            </Button>
          );
          if (!action.disabled_reason) return button;
          return (
            <TooltipProvider key={action.action} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    {action.disabled_reason.message}
                    {action.disabled_reason.cta ? (
                      <span className="ml-1 underline">
                        {action.disabled_reason.cta.label} →
                      </span>
                    ) : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {singleDirectAction ? (
          <span
            onClick={() => handleActionClick(singleDirectAction)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                handleActionClick(singleDirectAction);
            }}
          >
            {props.trigger}
          </span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {props.trigger ?? (
                <Button
                  variant="outline"
                  size="sm"
                  className={remainingActions.length === 0 ? "md:hidden" : ""}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleActions.map((action: ActionDTO) => (
                <DropdownMenuItem
                  key={`mobile-${action.action}`}
                  onClick={() => handleActionClick(action)}
                  className={
                    "cursor-pointer md:hidden" +
                    (action.disabled_reason && !action.disabled_reason.cta
                      ? " opacity-50"
                      : "")
                  }
                  title={action.disabled_reason?.message}
                >
                  {getActionLabel(action)}
                </DropdownMenuItem>
              ))}
              {remainingActions.map((action: ActionDTO, index: number) => (
                <DropdownMenuItem
                  key={`${action.action}-${index}`}
                  onClick={() => handleActionClick(action)}
                  className={
                    "cursor-pointer" +
                    (action.disabled_reason && !action.disabled_reason.cta
                      ? " opacity-50"
                      : "")
                  }
                  title={action.disabled_reason?.message}
                >
                  {getActionLabel(action)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ActionConfirmationDialog
        open={executor.showConfirmation}
        action={executor.pendingAction}
        isExecuting={executor.isExecuting}
        onConfirm={executor.confirmAction}
        onCancel={executor.cancelAction}
      />

      {formAction &&
        executor.renderActionForm &&
        executor.renderActionForm({
          action: formAction,
          onSubmit: executor.executeWithData,
          onClose: formOnClose,
          isSubmitting: executor.isExecuting,
          isOpen: formIsOpen,
          actionLabel: formAction.label,
        })}
    </>
  );
}
