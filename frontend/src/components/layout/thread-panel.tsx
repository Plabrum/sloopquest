import { X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ThreadViewers } from "@/components/chat/thread-viewers";
import { useThreadSync } from "@/hooks/threads/use-thread-sync";
import type { AuthUser } from "@/lib/auth-loader";

const PANEL_WIDTH = 360;

interface ThreadPanelProps {
  open: boolean;
  onClose: () => void;
  threadableType: string;
  threadableId: string;
  title?: string;
  currentUser: AuthUser & { name?: string };
}

export function ThreadPanel({
  open,
  onClose,
  threadableType,
  threadableId,
  title,
  currentUser,
}: ThreadPanelProps) {
  const thread = useThreadSync({
    threadableType,
    threadableId,
    enabled: open,
    currentUserId: currentUser.id,
    user: currentUser,
  });

  return (
    <aside
      role="complementary"
      aria-label="Thread"
      aria-hidden={!open}
      style={{ width: open ? PANEL_WIDTH : 0 }}
      className={cn(
        "sticky top-0 h-svh self-start overflow-hidden bg-sidebar shrink-0 transition-[width] duration-200 ease-out",
        "border-l border-sidebar-border",
        open && "shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.18)]",
      )}
    >
      {open && (
        <div className="flex h-full flex-col" style={{ width: PANEL_WIDTH }}>
          <header className="flex h-14 items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
            <div
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-background ring-1 ring-sidebar-border"
              aria-hidden
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display text-sm font-semibold tracking-tight truncate">
                {title ?? "Thread"}
              </div>
              <ThreadViewers viewers={thread.activeViewers} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close thread"
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <MessageList
              messages={thread.messages}
              currentUserId={currentUser.id}
              isLoading={thread.isLoading}
              onEditMessage={thread.editMessage}
              onDeleteMessage={thread.deleteMessage}
            />
            <TypingIndicator typingUsers={thread.typingUsers} />
          </div>

          <div className="shrink-0 p-3 border-t border-sidebar-border">
            <MessageInput
              onSendMessage={thread.sendMessage}
              onFocus={thread.handleInputFocus}
              onBlur={thread.handleInputBlur}
              disabled={thread.isSending}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
