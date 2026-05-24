/**
 * One message in the LLM conversation.
 *
 * Memoized on (id, content length, isInProgress) so token-by-token
 * streaming doesn't reflow earlier messages. The `Markdown` component
 * is itself the costliest render — re-running it for unchanged messages
 * is the regression we're guarding against.
 */
import { memo } from "react";

import { LlmOrb } from "@/components/ui/loading-orb";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { LlmSchemasMessageSchema as MessageSchema } from "@/openapi/litestarAPI.schemas";

import { ToolPill } from "@/components/llm/tool-pill";
import type { ToolPill as ToolPillType } from "@/hooks/llm/use-llm-streaming";

type Props = {
  message: MessageSchema;
  /** True for the assistant message currently streaming. */
  isInProgress?: boolean;
  /** Inline tool pills to render inside this assistant bubble. */
  toolPills?: ToolPillType[];
  /**
   * Fullscreen surface uses `bg-muted` for assistant bubbles — the page
   * background is `bg-background` so the bubble needs a darker tint to
   * read. The dock surface is already `bg-sidebar` (tinted), so the
   * bubble flips to `bg-background + border` to pop against the dock
   * instead.
   */
  expanded?: boolean;
};

function MessageBubbleInner({ message, isInProgress, toolPills, expanded }: Props) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={cn(
        "flex gap-3",
        isAssistant ? "flex-row" : "flex-row-reverse",
      )}
    >
      {isAssistant && (
        <div className="shrink-0">
          <LlmOrb size={32} />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[75%] min-w-0">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isAssistant
              ? expanded
                ? "bg-muted text-foreground rounded-tl-sm"
                : "bg-background border border-border text-foreground rounded-tl-sm"
              : "bg-primary text-primary-foreground rounded-tr-sm",
          )}
        >
          {isAssistant ? (
            <>
              {toolPills && toolPills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {toolPills.map((pill) => (
                    <ToolPill key={pill.id} pill={pill} />
                  ))}
                </div>
              )}
              {message.content.length > 0 ? (
                <Markdown variant="assistant">{message.content}</Markdown>
              ) : isInProgress ? (
                <span
                  className="inline-flex items-center gap-1.5"
                  aria-label="Assistant is typing"
                >
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              ) : null}
            </>
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.content.length !== next.message.content.length) return false;
  if (prev.isInProgress !== next.isInProgress) return false;
  if (prev.expanded !== next.expanded) return false;
  // Tool pills mutate during streaming — refresh on length OR status change.
  if ((prev.toolPills?.length ?? 0) !== (next.toolPills?.length ?? 0)) return false;
  if (prev.toolPills && next.toolPills) {
    for (let i = 0; i < prev.toolPills.length; i++) {
      if (prev.toolPills[i].status !== next.toolPills[i].status) return false;
    }
  }
  return true;
});
