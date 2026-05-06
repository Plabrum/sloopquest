/**
 * Action system types. Mirrors the schema the backend exposes via
 * `/schema/openapi.json` — once orval codegen has produced the real
 * `@/openapi/sloopquestAPI.schemas` types, these can be replaced with
 * re-exports if exact alignment is desired.
 */

export type ActionGroupType = string;

export interface ActionDTO {
  action: string;
  label: string;
  available?: boolean;
  priority?: number;
  confirmation_message?: string | null;
  icon?: string | null;
}

export interface RedirectActionResult {
  path: string;
}

export interface DownloadFileActionResult {
  url: string;
  filename: string;
}

export type ActionResult = RedirectActionResult | DownloadFileActionResult;

export interface ActionExecutionResponse {
  message?: string;
  invalidate_queries?: string[] | null;
  action_result?: ActionResult | null;
}

/** Object-level actions — performed on a specific object instance. */
export interface ObjectActionData {
  data: { id: string | number; actions?: ActionDTO[] } & Record<string, unknown>;
  actionGroup: ActionGroupType;
  onRefetch?: () => void;
  onActionComplete?: (action: ActionDTO, response: unknown) => void;
}

/** Top-level actions — not tied to a specific object (e.g. "Create ..."). */
export interface TopLevelActionData {
  actions?: ActionDTO[];
  actionGroup: ActionGroupType;
  onInvalidate?: () => void;
  onActionComplete?: (action: ActionDTO, response: unknown) => void;
}

/**
 * The mutation hooks the executor needs. Wire these up at the page or
 * provider level using the orval-generated hooks (see
 * `@/openapi/actions/actions` after `pnpm codegen`).
 */
export interface ActionMutations {
  executeGroupActionMutation: {
    mutateAsync: (params: {
      actionGroup: ActionGroupType;
      data: { action: string; data: Record<string, unknown> };
    }) => Promise<unknown>;
  };
  executeObjectActionMutation: {
    mutateAsync: (params: {
      actionGroup: ActionGroupType;
      objectId: string;
      data: { action: string; data: Record<string, unknown> };
    }) => Promise<unknown>;
  };
}
