import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LlmOrb } from "@/components/ui/loading-orb";
import { LlmConversation } from "@/components/llm/llm-conversation";
import { ConversationErrorBoundary } from "@/components/llm/conversation-error-boundary";

export function AiSurveyorEntry() {
  const [threadId, setThreadId] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="mt-6 block w-full rounded-sm border border-primary/40 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              AI Surveyor
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">⌘K</span>
          </div>
          <p className="font-serif text-[12px] italic leading-[1.45] text-muted-foreground">
            “Ask about blistering severity, gelcoat repair specs, or anything else on this section…”
          </p>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[440px] flex-col p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LlmOrb size={22} />
            AI surveyor
          </SheetTitle>
          {threadId && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-12 top-2 h-7 px-2 text-xs"
              onClick={() => setThreadId(null)}
            >
              New
            </Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ConversationErrorBoundary
            threadId={threadId}
            onThreadNotFound={() => setThreadId(null)}
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                That conversation isn't available anymore.
              </div>
            }
          >
            <LlmConversation
              threadId={threadId}
              onThreadCreated={setThreadId}
            />
          </ConversationErrorBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
}
