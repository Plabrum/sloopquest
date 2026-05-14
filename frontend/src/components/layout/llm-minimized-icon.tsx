import { LlmOrb } from "@/components/ui/loading-orb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVoiceSession } from "@/hooks/llm/use-voice-session";

type Props = {
  isOpen: boolean;
};

const TOOLTIPS: Record<string, string> = {
  idle: "Start voice assistant",
  connecting: "Connecting…",
  listening: "Listening — click to stop",
  speaking: "Assistant speaking",
  error: "Voice error — click to retry",
};

export function LlmMinimizedIcon({ isOpen }: Props) {
  const { state, toggle } = useVoiceSession();

  if (isOpen) return null;

  const active = state === "listening" || state === "speaking";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={TOOLTIPS[state]}
            aria-pressed={active}
            data-voice-state={state}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-8 px-6 rounded-full bg-background border border-border shadow-lg flex items-center hover:scale-105 active:scale-95 transition-transform"
          >
            <LlmOrb size={18} showPulseRing={active} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {TOOLTIPS[state]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
