import { useState } from "react";
import { MessageActions } from "./message-actions";
import { MessageAvatar } from "./message-avatar";
import { MessageContent } from "./message-content";
import { MessageInput } from "./message-input";
import { formatRelativeTime } from "@/lib/format";
import { type TiptapContent, hasContentText } from "@/lib/tiptap";
import type { ThreadsSchemasMessageSchema } from "@/openapi/litestarAPI.schemas";

interface MessageItemProps {
  message: ThreadsSchemasMessageSchema;
  isCurrentUser: boolean;
  onEdit?: (messageId: string, content: TiptapContent) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

export function MessageItem({ message, isCurrentUser, onEdit, onDelete }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const userName = message.user?.name ?? message.user?.email ?? "Unknown";

  const handleSaveEdit = async (content: TiptapContent) => {
    if (
      !onEdit ||
      !hasContentText(content) ||
      JSON.stringify(content) === JSON.stringify(message.content)
    ) {
      setIsEditing(false);
      return;
    }
    await onEdit(message.id, content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await onDelete(message.id);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const wasEdited = message.updated_at !== message.created_at;

  return (
    <div className="hover:bg-muted/50 group flex gap-3 px-4 py-3">
      <MessageAvatar userName={userName} />

      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{userName}</span>
          <span className="text-muted-foreground text-xs">{formatRelativeTime(message.created_at)}</span>
          {wasEdited && (
            <span className="text-muted-foreground text-xs italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <MessageInput
            mode="edit"
            initialContent={message.content}
            onSendMessage={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <MessageContent content={message.content} className="text-foreground/90" />
        )}
      </div>

      {isCurrentUser && !isEditing && (
        <MessageActions onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
      )}
    </div>
  );
}
