/**
 * SSE consumer for the LLM agent loop.
 *
 * Consumes the SSE stream from the Sloopquest LLM endpoints:
 *   POST /llm/threads/stream                       (create thread + first turn)
 *   POST /llm/threads/{thread_id}/messages/stream  (append + reply)
 *
 * SSE event types below are manually maintained — OpenAPI does not describe
 * SSE bodies. Keep in sync with the backend SseEvent union in
 * backend/app/platform/llm/schemas.py.
 *
 * Event protocol:
 *   token            { delta: string }
 *   tool_call        { id: string; name: string; input: object }
 *   tool_result      { tool_use_id: string; is_error: boolean }
 *   message_complete { message: MessageSchema; invalidate_queries: string[] }
 *   error            { code: string; message: string }
 *
 * On `message_complete` we invalidate the GET-messages query so the
 * materialized list re-renders. Also invalidate the thread-list so the
 * history dropdown reflects the new `last_message_at`.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-handler";
import { useThreadableFromRoute } from "@/lib/llm/threadable";
import {
  getLlmThreadsListThreadsHandlerQueryKey,
  getLlmThreadsThreadIdMessagesGetThreadMessagesHandlerQueryKey,
  llmThreadsThreadIdMessagesGetThreadMessagesHandler,
} from "@/openapi/llm/llm";
import type { LlmSchemasMessageSchema as MessageSchema } from "@/openapi/litestarAPI.schemas";


export type LlmStreamingStatus =
  | "idle"
  | "streaming"
  | "tool_running"
  | "rate_limited"
  | "error";

export type ToolPillStatus = "running" | "ok" | "error";

export type ToolPill = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolPillStatus;
};

export type InProgressMessage = {
  /** Local-only id; replaced by the persisted MessageSchema on complete. */
  id: string;
  content: string;
  toolPills: ToolPill[];
};

export type SendOpts = {
  timezone?: string;
  /** Free-form context shipped with the create-thread request. */
  context?: Record<string, unknown>;
};

export type SendResult = {
  threadId: string;
  message: MessageSchema;
};

type StreamTokenEvent = { event: "token"; delta: string };
type StreamToolCallEvent = {
  event: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
};
type StreamToolResultEvent = {
  event: "tool_result";
  tool_use_id: string;
  is_error: boolean;
};
type StreamMessageCompleteEvent = {
  event: "message_complete";
  message: MessageSchema;
  invalidate_queries?: string[];
};
type StreamErrorEvent = {
  event: "error";
  code: string;
  message: string;
};

type StreamEvent =
  | StreamTokenEvent
  | StreamToolCallEvent
  | StreamToolResultEvent
  | StreamMessageCompleteEvent
  | StreamErrorEvent;

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api") as string;

/**
 * After a CREATE-thread stream closes, poll the messages endpoint until
 * the persisted rows are visible. Closes the race between SSE-response
 * close and the backend transaction COMMIT.
 */
async function pollForThreadMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  threadId: string,
): Promise<void> {
  const queryKey =
    getLlmThreadsThreadIdMessagesGetThreadMessagesHandlerQueryKey(threadId);
  const deadline = Date.now() + 2000;
  const intervals = [25, 50, 100, 200, 400];
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      await queryClient.fetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          llmThreadsThreadIdMessagesGetThreadMessagesHandler(threadId, undefined, signal),
        staleTime: 0,
      });
      return;
    } catch {
      const wait = intervals[Math.min(attempt, intervals.length - 1)];
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

function nextLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `llm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseFrames(buffer: string): {
  events: StreamEvent[];
  remainder: string;
} {
  // SSE frames separated by blank line. Normalize line endings then
  // split — Litestar emits `\r\n\r\n` between frames.
  const normalized = buffer.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const events: StreamEvent[] = [];
  let cursor = 0;
  while (true) {
    const sep = normalized.indexOf("\n\n", cursor);
    if (sep === -1) break;
    const frame = normalized.slice(cursor, sep);
    cursor = sep + 2;

    let event: string | null = null;
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const v = line.slice(5);
        dataLines.push(v.startsWith(" ") ? v.slice(1) : v);
      }
    }
    if (event == null || dataLines.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataLines.join("\n"));
    } catch {
      continue;
    }
    if (parsed && typeof parsed === "object") {
      events.push({ ...(parsed as object), event } as StreamEvent);
    }
  }
  return { events, remainder: normalized.slice(cursor) };
}

export type UseLlmStreamingApi = {
  inProgressMessage: InProgressMessage | null;
  status: LlmStreamingStatus;
  error: string | null;
  send: (content: string, opts?: SendOpts) => Promise<SendResult | null>;
  cancel: () => void;
};

export function useLlmStreaming(
  threadId: string | null,
  onThreadCreated?: (id: string) => void,
): UseLlmStreamingApi {
  const queryClient = useQueryClient();
  const [inProgressMessage, setInProgressMessage] =
    useState<InProgressMessage | null>(null);
  const [status, setStatus] = useState<LlmStreamingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;
  const onThreadCreatedRef = useRef(onThreadCreated);
  onThreadCreatedRef.current = onThreadCreated;
  const threadable = useThreadableFromRoute();
  const threadableRef = useRef(threadable);
  threadableRef.current = threadable;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const send = useCallback(
    async (
      content: string,
      opts: SendOpts = {},
    ): Promise<SendResult | null> => {
      if (status === "streaming" || status === "tool_running") {
        return null;
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const localId = nextLocalId();
      setInProgressMessage({ id: localId, content: "", toolPills: [] });
      setStatus("streaming");
      setError(null);

      const isCreate = threadIdRef.current == null;
      const url = isCreate
        ? `${API_BASE}/llm/threads/stream`
        : `${API_BASE}/llm/threads/${threadIdRef.current}/messages/stream`;

      const currentPage =
        typeof window !== "undefined" ? window.location.pathname : null;
      const body: Record<string, unknown> = {
        content,
        timezone:
          opts.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const ctx = { current_page: currentPage, ...(opts.context ?? {}) };
      body.context = ctx;

      if (isCreate) {
        const ref = threadableRef.current;
        if (ref) {
          body.threadable_type = ref.threadable_type;
          body.threadable_id = ref.threadable_id;
        }
      }

      let result: SendResult | null = null;
      let sawError = false;

      try {
        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });

        if (!response.ok) {
          let toastMessage: string;
          if (response.status === 429) {
            toastMessage =
              "You've hit your rate limit. Try again in a few minutes.";
            setStatus("rate_limited");
          } else {
            toastMessage = "Something went wrong — please try again.";
            setStatus("error");
          }
          setError(toastMessage);
          toast.error(toastMessage);
          try {
            await response.text();
          } catch {
            // ignore
          }
          return null;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response has no body");
        }
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseFrames(buffer);
          buffer = remainder;
          for (const event of events) {
            if (event.event === "token") {
              setInProgressMessage((prev) =>
                prev ? { ...prev, content: prev.content + event.delta } : prev,
              );
            } else if (event.event === "tool_call") {
              setStatus("tool_running");
              setInProgressMessage((prev) =>
                prev
                  ? {
                      ...prev,
                      toolPills: [
                        ...prev.toolPills,
                        {
                          id: event.id,
                          name: event.name,
                          input: event.input,
                          status: "running",
                        },
                      ],
                    }
                  : prev,
              );
            } else if (event.event === "tool_result") {
              setInProgressMessage((prev) => {
                if (!prev) return prev;
                const idx = prev.toolPills.findIndex(
                  (p) => p.id === event.tool_use_id,
                );
                if (idx === -1) return prev;
                const next = prev.toolPills.slice();
                next[idx] = {
                  ...next[idx],
                  status: event.is_error ? "error" : "ok",
                };
                return { ...prev, toolPills: next };
              });
              setStatus("streaming");
            } else if (event.event === "message_complete") {
              result = {
                threadId: event.message.thread_id,
                message: event.message,
              };
              if (!isCreate) {
                await queryClient.invalidateQueries({
                  queryKey:
                    getLlmThreadsThreadIdMessagesGetThreadMessagesHandlerQueryKey(
                      event.message.thread_id,
                    ),
                });
              }
              await queryClient.invalidateQueries({
                queryKey: getLlmThreadsListThreadsHandlerQueryKey(),
              });
              for (const key of event.invalidate_queries ?? []) {
                await queryClient.invalidateQueries({ queryKey: [key] });
              }
            } else if (event.event === "error") {
              sawError = true;
              setError(event.message);
              setStatus(
                event.code === "rate_limited" ? "rate_limited" : "error",
              );
              toast.error(event.message);
            }
          }
        }
        if (buffer.trim().length > 0) {
          const { events } = parseFrames(buffer + "\n\n");
          for (const event of events) {
            if (event.event === "message_complete") {
              result = {
                threadId: event.message.thread_id,
                message: event.message,
              };
            }
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          setStatus("idle");
          setInProgressMessage(null);
          return null;
        }
        const message = getErrorMessage(err);
        setError(message);
        setStatus("error");
        toast.error(message);
        return null;
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }

      if (!sawError && result) {
        if (isCreate) {
          await pollForThreadMessages(queryClient, result.threadId);
          onThreadCreatedRef.current?.(result.threadId);
        }
        setInProgressMessage(null);
        setStatus("idle");
      } else if (!result && !sawError) {
        setInProgressMessage(null);
        setStatus("idle");
      }
      return result;
    },
    [queryClient, status],
  );

  return { inProgressMessage, status, error, send, cancel };
}
