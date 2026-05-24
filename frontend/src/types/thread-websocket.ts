export const ThreadSocketMessageType = {
  MARK_READ: "mark_read",
  USER_FOCUS: "user_focus",
  USER_BLUR: "user_blur",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  MESSAGE_CREATED: "message_created",
  MESSAGE_UPDATED: "message_updated",
  MESSAGE_DELETED: "message_deleted",
} as const;

export type ThreadSocketMessageType =
  (typeof ThreadSocketMessageType)[keyof typeof ThreadSocketMessageType];

export interface ClientMessage {
  message_type: ThreadSocketMessageType;
}

export interface ServerMessage {
  message_type: ThreadSocketMessageType;
  viewers: string[];
  user_id?: string | null;
  message_id?: string | null;
  thread_id?: string | null;
}

export interface Viewer {
  user_id: string;
  name: string;
  is_typing: boolean;
}
