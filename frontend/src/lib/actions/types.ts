export type { ActionGroupType } from "@/openapi/litestarAPI.schemas";
import type {
  ActionsActionGroupExecuteActionBody,
  ActionsActionGroupObjectIdExecuteObjectActionBody,
} from "@/openapi/litestarAPI.schemas";

export interface ActionCTA {
  label: string;
  path: string;
}

export interface DisabledReason {
  message: string;
  cta?: ActionCTA | null;
}

export interface ActionDTO {
  action: string;
  label: string;
  available?: boolean;
  priority?: number;
  confirmation_message?: string | null;
  icon?: string | null;
  disabled_reason?: DisabledReason | null;
  target_state?: string | null;
}

export interface RedirectActionResult {
  type: "redirect";
  path: string;
}

export interface DownloadFileActionResult {
  type: "download_file";
  url: string;
  filename: string;
}

export interface CopyToClipboardActionResult {
  type: "copy_to_clipboard";
  text: string;
  toast?: string | null;
}

export type ActionResult =
  | RedirectActionResult
  | DownloadFileActionResult
  | CopyToClipboardActionResult;

export interface ActionExecutionResponse {
  message?: string;
  invalidate_queries?: string[] | null;
  action_result?: ActionResult | null;
  created_id?: string | null;
}

/** Object-level actions — performed on a specific object instance. */
export interface ObjectActionData {
  data: { id: string | number; actions?: ActionDTO[] } & Record<string, unknown>;
  actionGroup: import("@/openapi/litestarAPI.schemas").ActionGroupType;
  onRefetch?: () => void;
  onActionComplete?: (action: ActionDTO, response: unknown) => void;
}

/** Top-level actions — not tied to a specific object (e.g. "Create ..."). */
export interface TopLevelActionData {
  actions?: ActionDTO[];
  actionGroup: import("@/openapi/litestarAPI.schemas").ActionGroupType;
  onInvalidate?: () => void;
  onActionComplete?: (action: ActionDTO, response: unknown) => void;
}

/**
 * Mutation hook interfaces matching the orval-generated hooks exactly.
 * Used by execute-action-api.ts — mutations are created inside useActionExecutor.
 */
export interface ActionMutations {
  executeGroupActionMutation: {
    mutateAsync: (params: {
      actionGroup: import("@/openapi/litestarAPI.schemas").ActionGroupType;
      data: ActionsActionGroupExecuteActionBody;
    }) => Promise<ActionExecutionResponse>;
  };
  executeObjectActionMutation: {
    mutateAsync: (params: {
      actionGroup: import("@/openapi/litestarAPI.schemas").ActionGroupType;
      objectId: string;
      data: ActionsActionGroupObjectIdExecuteObjectActionBody;
    }) => Promise<ActionExecutionResponse>;
  };
}
