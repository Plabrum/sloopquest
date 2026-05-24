import type {
  ActionsActionGroupExecuteActionBody,
  ActionsActionGroupObjectIdExecuteObjectActionBody,
} from "@/openapi/litestarAPI.schemas";
import { generatedRegistry } from "@/openapi/actions/registry.gen";
import {
  SurveyTemplateCreateForm,
  SurveyTemplateUpdateForm,
} from "@/openapi/actions/survey-template-forms";
import { CalendarEventActionsCreateForm } from "@/openapi/actions/calendar-event-forms";

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
  "survey_template_actions__create": { render: (p) => <SurveyTemplateCreateForm {...(p as Parameters<typeof SurveyTemplateCreateForm>[0])} /> },
  "survey_template_actions__update": { render: (p) => <SurveyTemplateUpdateForm {...(p as Parameters<typeof SurveyTemplateUpdateForm>[0])} /> },
  "calendar_event_actions__create": { render: (p) => <CalendarEventActionsCreateForm {...(p as Parameters<typeof CalendarEventActionsCreateForm>[0])} /> },
} as ActionRegistry;

export function getActionRenderer(
  actionType: ActionType,
): ActionRegistryEntry["render"] | undefined {
  const entry = (actionRegistry as Record<string, ActionRegistryEntry>)[
    actionType
  ];
  return entry?.render;
}
