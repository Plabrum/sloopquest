import type { AuthUser } from "@/lib/auth-loader";
import { useThreadConnection } from "./use-thread-connection";
import { useThreadMessages } from "./use-thread-messages";

interface UseThreadSyncOptions {
  threadableType: string;
  threadableId: string;
  enabled?: boolean;
  currentUserId: string;
  user: AuthUser & { name?: string };
}

export function useThreadSync({
  threadableType,
  threadableId,
  enabled = true,
  currentUserId,
  user,
}: UseThreadSyncOptions) {
  const {
    messages,
    isLoading,
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    refetchMessages,
  } = useThreadMessages({ threadableType, threadableId, enabled, user });

  const {
    viewers,
    isConnected,
    handleInputFocus,
    handleInputBlur,
    sendMarkRead,
    updateUserName,
  } = useThreadConnection({
    threadableType,
    threadableId,
    enabled,
    onMessageUpdate: refetchMessages,
  });

  const typingUsers = viewers.filter((v) => v.is_typing && v.user_id !== currentUserId);
  const activeViewers = viewers.filter((v) => v.user_id !== currentUserId);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    refetchMessages,
    viewers,
    activeViewers,
    typingUsers,
    isConnected,
    handleInputFocus,
    handleInputBlur,
    sendMarkRead,
    updateUserName,
  };
}
