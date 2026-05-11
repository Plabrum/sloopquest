import { useQueryClient } from "@tanstack/react-query";
import type { ThreadsSchemasMessageSchema, MessageListResponse } from "@/openapi/litestarAPI.schemas";
import type { TiptapContent } from "@/lib/tiptap";
import type { AuthUser } from "@/lib/auth-loader";
import {
  useThreadsThreadableTypeThreadableIdMessagesListMessages,
  useThreadsThreadableTypeThreadableIdMessagesCreateMessage,
  getThreadsThreadableTypeThreadableIdMessagesListMessagesQueryKey,
} from "@/openapi/threads/threads";

interface UseThreadMessagesOptions {
  threadableType: string;
  threadableId: string;
  enabled?: boolean;
  user: AuthUser & { name?: string };
}

export function useThreadMessages({
  threadableType,
  threadableId,
  enabled = true,
  user,
}: UseThreadMessagesOptions) {
  const queryClient = useQueryClient();
  const threadableIdNum = parseInt(threadableId, 10);

  const queryKey = getThreadsThreadableTypeThreadableIdMessagesListMessagesQueryKey(
    threadableType,
    threadableIdNum,
    { limit: 100, offset: 0 },
  );

  const {
    data: messagesData,
    refetch: refetchMessages,
    isLoading,
  } = useThreadsThreadableTypeThreadableIdMessagesListMessages(
    threadableType,
    threadableIdNum,
    { limit: 100, offset: 0 },
    { query: { enabled } },
  );

  const createMessageMutation =
    useThreadsThreadableTypeThreadableIdMessagesCreateMessage({
      mutation: {
        onMutate: async (variables) => {
          await queryClient.cancelQueries({ queryKey });

          const previousMessages = queryClient.getQueryData<MessageListResponse>(queryKey);

          if (previousMessages) {
            const optimisticMessage = {
              id: `optimistic-${Date.now()}`,
              thread_id: "",
              user_id: user.id,
              content: variables.data.content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user: {
                id: user.id,
                email: user.email,
                name: user.name ?? user.email,
              },
            } as unknown as ThreadsSchemasMessageSchema;

            queryClient.setQueryData<MessageListResponse>(queryKey, {
              ...previousMessages,
              messages: [...previousMessages.messages, optimisticMessage],
            });
          }

          return { previousMessages };
        },
        onError: (_err, _variables, context) => {
          if (context?.previousMessages) {
            queryClient.setQueryData(queryKey, context.previousMessages);
          }
        },
        onSettled: () => {
          refetchMessages();
        },
      },
    });

  const messages = messagesData?.messages ?? [];

  const sendMessage = async (content: TiptapContent) => {
    await createMessageMutation.mutateAsync({
      threadableType,
      threadableId: threadableIdNum,
      data: { content },
    });
  };

  const editMessage = async (messageId: string, content: TiptapContent) => {
    const response = await fetch(`/actions/message_actions/${messageId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message_actions__update", data: { content } }),
    });
    if (!response.ok) throw new Error("Failed to edit message");
    await refetchMessages();
  };

  const deleteMessage = async (messageId: string) => {
    const response = await fetch(`/actions/message_actions/${messageId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message_actions__delete" }),
    });
    if (!response.ok) throw new Error("Failed to delete message");
    await refetchMessages();
  };

  return {
    messages,
    isLoading,
    isSending: createMessageMutation.isPending,
    sendMessage,
    editMessage,
    deleteMessage,
    refetchMessages,
  };
}
