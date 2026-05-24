import { useState } from "react";
import { MinimalTiptap } from "@/components/ui/minimal-tiptap";
import { type TiptapContent, hasContentText } from "@/lib/tiptap";

interface MessageInputProps {
  onSendMessage: (content: TiptapContent) => Promise<void>;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  mode?: "new" | "edit";
  initialContent?: TiptapContent;
  onCancel?: () => void;
}

export function MessageInput({
  onSendMessage,
  onFocus,
  onBlur,
  disabled = false,
  mode = "new",
  initialContent,
  onCancel,
}: MessageInputProps) {
  const [content, setContent] = useState<TiptapContent | null>(initialContent || null);
  const [isSending, setIsSending] = useState(false);

  const isEditMode = mode === "edit";

  const handleSend = async () => {
    if (!hasContentText(content) || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(content!);
      if (!isEditMode) setContent(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <MinimalTiptap
      content={content}
      onChange={setContent}
      placeholder={isEditMode ? "Edit message..." : "Type a message..."}
      editable={!disabled && !isSending}
      editorClassName={isEditMode ? "" : "min-h-20"}
      toolbar="minimal"
      onSend={handleSend}
      isSending={isSending}
      mode={mode}
      onCancel={onCancel}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
