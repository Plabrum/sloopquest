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
  user_speaking: "Hearing you…",
  speaking: "Assistant speaking",
  error: "Voice error — click to retry",
};

const RING_CLASS: Record<string, string> = {
  idle: "",
  connecting:
    "ring-2 ring-muted-foreground/30 ring-offset-2 ring-offset-background animate-pulse",
  listening:
    "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background",
  user_speaking:
    "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-[0_0_18px_-2px_rgb(16_185_129/0.7)]",
  speaking:
    "ring-2 ring-sky-500/70 ring-offset-2 ring-offset-background shadow-[0_0_18px_-2px_rgb(14_165_233/0.7)]",
  error: "ring-2 ring-destructive ring-offset-2 ring-offset-background",
};

export function LlmMinimizedIcon({ isOpen }: Props) {
  const { state, toggle } = useVoiceSession();

  if (isOpen) return null;

  const pulse = state === "user_speaking" || state === "speaking";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={TOOLTIPS[state]}
            aria-pressed={pulse}
            data-voice-state={state}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-8 px-6 rounded-full bg-background border border-border shadow-lg flex items-center hover:scale-105 active:scale-95 transition-all duration-200 ${RING_CLASS[state] ?? ""}`}
          >
            <LlmOrb size={18} showPulseRing={pulse} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {TOOLTIPS[state]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
