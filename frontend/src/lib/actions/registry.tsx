import type {
  ActionsActionGroupExecuteActionBody,
  ActionsActionGroupObjectIdExecuteObjectActionBody,
} from "@/openapi/litestarAPI.schemas";
import { generatedRegistry } from "@/openapi/actions/registry.gen";

export type ActionBodyUnion =
  | ActionsActionGroupExecuteActionBody
  | ActionsActionGroupObjectIdExecuteObjectActionBody;

export type ActionType = ActionBodyUnion["action"];

export type ActionDataTypeMap = {
  [K in ActionType]: Extract<ActionBodyUnion, { action: K }>["data"];
};

export interface ActionRegistryEntry<TData = unknown> {
  /** Modal form for the action, or null to skip the form layer entirely. */
  render: (params: {
    objectData?: unknown;
    defaultValues?: unknown;
    onSubmit: (data: TData) => void;
    onClose: () => void;
    isSubmitting: boolean;
    isOpen: boolean;
    actionLabel: string;
  }) => React.ReactElement | null;
}

export type ActionRegistry = Partial<{
  [K in ActionType]: ActionRegistryEntry<ActionDataTypeMap[K]>;
}>;

export const actionRegistry: ActionRegistry = {
  ...generatedRegistry,
} as ActionRegistry;

export function getActionRenderer(
  actionType: ActionType,
): ActionRegistryEntry["render"] | undefined {
  const entry = (actionRegistry as Record<string, ActionRegistryEntry>)[
    actionType
  ];
  return entry?.render;
}
