import { ObjectActions } from "@/components/object-detail/object-actions";
import type {
  ActionDTO,
  ActionGroupType,
  ActionMutations,
} from "@/lib/actions/types";

interface TopLevelActionsProps extends ActionMutations {
  actionGroup: ActionGroupType;
  /**
   * Suspense query hook returning the available top-level actions for the
   * group. Wire this up using the orval-generated
   * `useActionsActionGroupListActionsSuspense` after `pnpm codegen`.
   */
  useListActions: (actionGroup: ActionGroupType) => {
    data: { actions: ActionDTO[] };
  };
  onInvalidate?: () => void;
  onActionComplete?: (action: ActionDTO, response: unknown) => void;
  /** When true, all visible buttons use the primary (default) variant. */
  allPrimary?: boolean;
  /** Visible buttons before overflow. */
  maxVisible?: number;
  /** Custom trigger element for the overflow dropdown menu. */
  trigger?: React.ReactNode;
  /** Context values injected into form defaultValues. */
  formContext?: Record<string, unknown>;
}

/**
 * Fetches and renders the top-level action set for an action group via
 * the list_actions endpoint (no object context).
 */
export function TopLevelActions({
  actionGroup,
  useListActions,
  executeGroupActionMutation,
  executeObjectActionMutation,
  onInvalidate,
  onActionComplete,
  allPrimary,
  maxVisible,
  trigger,
  formContext,
}: TopLevelActionsProps) {
  const { data } = useListActions(actionGroup);

  return (
    <ObjectActions
      actions={data.actions}
      actionGroup={actionGroup}
      executeGroupActionMutation={executeGroupActionMutation}
      executeObjectActionMutation={executeObjectActionMutation}
      onInvalidate={onInvalidate}
      onActionComplete={onActionComplete}
      allPrimary={allPrimary}
      maxVisible={maxVisible}
      trigger={trigger}
      formContext={formContext}
    />
  );
}
