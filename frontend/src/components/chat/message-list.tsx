import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./message-item";
import type { ThreadsSchemasMessageSchema } from "@/openapi/litestarAPI.schemas";
import type { TiptapContent } from "@/lib/tiptap";

interface MessageListProps {
  messages: ThreadsSchemasMessageSchema[];
  currentUserId: string;
  isLoading?: boolean;
  onEditMessage?: (messageId: string, content: TiptapContent) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full flex-1">
      <div className="flex flex-col">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isCurrentUser={message.user_id === currentUserId}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
