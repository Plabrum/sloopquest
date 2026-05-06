/**
 * Gloria composer — single-line text input with Send button.
 *
 * Behavior:
 *   - Enter (no shift) submits.
 *   - Shift+Enter inserts a newline (currently single-line only; reserved
 *     for a future multi-line variant).
 *   - Esc blurs the input. Does NOT close the dock — the dock-level
 *     keyboard handler owns Cmd+Shift+G.
 *   - Up arrow on an empty composer recalls the last user message.
 *   - On `focusComposerPending` (set by Cmd+J), focuses and clears the flag.
 */
import { Mic, Send } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { consumeFocusComposer } from "@/hooks/use-gloria-dock-state";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  /** Composer recalls this string when the user presses Up on an empty input. */
  lastUserMessage?: string;
  /** When true, the input focuses on next render and the flag is cleared. */
  focusComposerPending?: boolean;
  /** Visual variant — fullscreen has bigger affordances than dock. */
  variant?: "dock" | "fullscreen";
  placeholder?: string;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  lastUserMessage,
  focusComposerPending,
  variant = "dock",
  placeholder = "Message Gloria…",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusComposerPending) {
      inputRef.current?.focus();
      consumeFocusComposer();
    }
  }, [focusComposerPending]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowUp" && value.length === 0 && lastUserMessage) {
      e.preventDefault();
      onChange(lastUserMessage);
    }
  }

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        variant === "fullscreen" && "gap-3 max-w-3xl mx-auto",
      )}
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Message Gloria"
          className={cn(
            "w-full bg-secondary border-[1.5px] border-input rounded-full text-sm focus:border-ring outline-none transition-colors disabled:opacity-60",
            variant === "dock"
              ? "py-2.5 pl-4 pr-12"
              : "py-3 pl-5 pr-14",
          )}
        />
        <button
          type="button"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors",
            variant === "dock"
              ? "right-1 w-[30px] h-[30px]"
              : "right-1.5 w-[34px] h-[34px]",
          )}
        >
          <Send className={variant === "dock" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      </div>
      {variant === "fullscreen" && (
        <button
          type="button"
          disabled
          aria-label="Voice input (coming soon)"
          title="Voice input (coming soon)"
          className="shrink-0 w-[46px] h-[46px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-50 cursor-not-allowed"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
