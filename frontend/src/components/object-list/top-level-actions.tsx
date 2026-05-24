import { Suspense } from "react";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { useActionsActionGroupListActionsSuspense } from "@/openapi/actions/actions";
import type { ActionDTO, ActionGroupType } from "@/lib/actions/types";

interface TopLevelActionsProps {
  actionGroup: ActionGroupType;
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

function TopLevelActionsInner(props: TopLevelActionsProps) {
  const { data } = useActionsActionGroupListActionsSuspense(props.actionGroup);

  return (
    <ObjectActions
      actions={data.actions}
      actionGroup={props.actionGroup}
      onInvalidate={props.onInvalidate}
      onActionComplete={props.onActionComplete}
      allPrimary={props.allPrimary}
      maxVisible={props.maxVisible}
      trigger={props.trigger}
      formContext={props.formContext}
    />
  );
}

export function TopLevelActions(props: TopLevelActionsProps) {
  return (
    <Suspense>
      <TopLevelActionsInner {...props} />
    </Suspense>
  );
}
