import { Suspense, useCallback, useRef } from "react";
import { MoreHorizontal, SquarePen, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LlmOrb } from "@/components/ui/loading-orb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useShortcut } from "@/lib/shortcuts";
import { useLlmThreadsListThreadsHandlerSuspense } from "@/openapi/llm/llm";

import { ComposerFocusContext } from "@/components/llm/composer";
import { ConversationErrorBoundary } from "@/components/llm/conversation-error-boundary";
import { LlmConversation } from "@/components/llm/llm-conversation";
import { LlmThreadHistory } from "@/components/llm/llm-thread-history";
import { LlmMinimizedIcon } from "@/components/layout/llm-minimized-icon";
import { useLlmDockState } from "@/hooks/llm/use-llm-dock-state";

const DOCK_WIDTH = 400;

function ActiveThreadSubtitleInner({ threadId }: { threadId: string }) {
  const { data } = useLlmThreadsListThreadsHandlerSuspense();
  const match = data.threads.find((t) => t.id === threadId);
  return (
    <span className="truncate text-xs text-muted-foreground">
      {match?.title ?? "Conversation"}
    </span>
  );
}

function ActiveThreadSubtitle({ threadId }: { threadId: string | null }) {
  if (!threadId) {
    return (
      <span className="truncate text-xs text-muted-foreground">
        Ask anything to start a conversation
      </span>
    );
  }
  return (
    <Suspense fallback={<Skeleton className="h-3 w-28 mt-0.5" />}>
      <ActiveThreadSubtitleInner threadId={threadId} />
    </Suspense>
  );
}

export function LlmDock() {
  const dock = useLlmDockState();
  const isOpen = dock.mode === "docked";
  const composerInputRef = useRef<HTMLInputElement>(null);

  useShortcut({
    id: "dock.toggle",
    keys: "mod+shift+g",
    scope: "global",
    label: "Toggle LLM assistant",
    allowInFields: true,
    handler: dock.toggleDock,
  });

  useShortcut({
    id: "dock.focus-composer",
    keys: "mod+j",
    scope: "global",
    label: "Focus assistant composer",
    allowInFields: true,
    when: useCallback(() => isOpen, [isOpen]),
    handler: useCallback(() => composerInputRef.current?.focus(), []),
  });

  return (
    <>
      <LlmMinimizedIcon isOpen={isOpen} onOpen={dock.openDock} />
      <aside
        role="complementary"
        aria-label="LLM assistant"
        aria-hidden={!isOpen}
        style={{ width: isOpen ? DOCK_WIDTH : 0 }}
        className={cn(
          "sticky top-0 h-svh self-start overflow-hidden bg-sidebar shrink-0 transition-[width] duration-200 ease-out",
          "border-l border-sidebar-border",
          isOpen && "shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.18)]",
        )}
      >
        {isOpen && (
          <div className="flex h-full flex-col" style={{ width: DOCK_WIDTH }}>
            <header className="flex h-14 items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
              <div
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-background ring-1 ring-sidebar-border"
                aria-hidden
              >
                <LlmOrb size={20} />
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="font-display text-sm font-semibold tracking-tight">
                  LLM Assistant
                </div>
                <ActiveThreadSubtitle threadId={dock.activeThreadId} />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Conversation options"
                    className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0">
                  <div className="px-1 py-1">
                    <DropdownMenuItem onSelect={() => dock.setActiveThreadId(null)}>
                      <SquarePen className="w-4 h-4 mr-2" />
                      New conversation
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="m-0" />
                  <LlmThreadHistory
                    activeThreadId={dock.activeThreadId}
                    onSelect={dock.setActiveThreadId}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={dock.closeDock}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <ConversationErrorBoundary
              threadId={dock.activeThreadId}
              onThreadNotFound={() => dock.setActiveThreadId(null)}
              fallback={
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <p>That conversation isn't available anymore.</p>
                  <button
                    type="button"
                    onClick={() => dock.setActiveThreadId(null)}
                    className="text-xs underline hover:text-foreground"
                  >
                    Start a new one
                  </button>
                </div>
              }
            >
              <ComposerFocusContext.Provider value={composerInputRef}>
                <LlmConversation
                  threadId={dock.activeThreadId}
                  onThreadCreated={(id) => dock.setActiveThreadId(id)}
                />
              </ComposerFocusContext.Provider>
            </ConversationErrorBoundary>
          </div>
        )}
      </aside>
    </>
  );
}
