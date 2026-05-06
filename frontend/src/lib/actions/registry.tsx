import { generatedRegistry } from "@/openapi/actions/registry.gen";

/**
 * Discriminated union of all action bodies the backend accepts. As
 * specific actions are added, replace the placeholder member with their
 * concrete types so dispatch is type-safe at the dialog level.
 */
export type ActionBodyUnion = {
  action: string;
  data: Record<string, unknown>;
};

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

/**
 * Hand-written forms that take precedence over generated ones.
 */
const overrides: Record<string, ActionRegistryEntry> = {};

export const actionRegistry: ActionRegistry = {
  ...generatedRegistry,
  ...overrides,
} as ActionRegistry;

export function getActionRenderer(
  actionType: ActionType,
): ActionRegistryEntry["render"] | undefined {
  const entry = (actionRegistry as Record<string, ActionRegistryEntry>)[
    actionType
  ];
  return entry?.render;
}
