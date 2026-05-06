/**
 * Local stand-in for the Sloopquest LLM thread/messages endpoints.
 *
 * The Cuida port (SLQ-32) ships the chat UI ahead of the backend
 * surface. These types and TanStack Query hooks mirror the Cuida
 * Orval-generated shape so the components compile and render; once the
 * backend defines `/api/llm/threads/*` (and Orval is configured to
 * generate against it), this file is replaced by `@/openapi/llm/llm`
 * imports — the call sites won't need to change.
 */
import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import axios from "axios";

import { customInstance } from "@/openapi/custom-instance";

export interface MessageSchema {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface MessageListPage {
  messages: MessageSchema[];
}

export interface ThreadSummarySchema {
  id: string;
  title: string | null;
  last_message_at: string | null;
}

export interface ThreadListPage {
  threads: ThreadSummarySchema[];
}

export interface ListThreadsParams {
  limit?: number;
}

export function llmThreadsListThreads(
  params?: ListThreadsParams,
  signal?: AbortSignal,
): Promise<ThreadListPage> {
  return customInstance<ThreadListPage>({
    url: "/llm/threads",
    method: "GET",
    params,
    signal,
  });
}

export function llmThreadsThreadIdMessagesGetMessages(
  threadId: string,
  _params?: undefined,
  signal?: AbortSignal,
): Promise<MessageListPage> {
  return customInstance<MessageListPage>({
    url: `/llm/threads/${threadId}/messages`,
    method: "GET",
    signal,
  });
}

export function llmThreadsThreadIdDeleteThread(
  threadId: string,
): Promise<void> {
  return customInstance<void>({
    url: `/llm/threads/${threadId}`,
    method: "DELETE",
  });
}

export function getLlmThreadsListThreadsQueryKey(
  params?: ListThreadsParams,
): readonly unknown[] {
  return params ? (["/llm/threads", params] as const) : (["/llm/threads"] as const);
}

export function getLlmThreadsThreadIdMessagesGetMessagesQueryOptions(
  threadId: string,
) {
  return queryOptions({
    queryKey: ["/llm/threads", threadId, "messages"] as const,
    queryFn: ({ signal }) =>
      llmThreadsThreadIdMessagesGetMessages(threadId, undefined, signal),
  });
}

export function useLlmThreadsListThreadsSuspense(params?: ListThreadsParams) {
  return useSuspenseQuery({
    queryKey: getLlmThreadsListThreadsQueryKey(params),
    queryFn: ({ signal }) => llmThreadsListThreads(params, signal),
  });
}

export function useLlmThreadsThreadIdMessagesGetMessagesSuspense(
  threadId: string,
) {
  return useSuspenseQuery(
    getLlmThreadsThreadIdMessagesGetMessagesQueryOptions(threadId),
  );
}

export function useLlmThreadsThreadIdDeleteThread(options?: {
  mutation?: UseMutationOptions<
    void,
    unknown,
    { threadId: string },
    unknown
  >;
}) {
  return useMutation({
    mutationFn: ({ threadId }: { threadId: string }) =>
      llmThreadsThreadIdDeleteThread(threadId),
    ...(options?.mutation ?? {}),
  });
}

export function isAxiosErrorWithStatus(err: unknown): err is import("axios").AxiosError {
  return axios.isAxiosError(err);
}
