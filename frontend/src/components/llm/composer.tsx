import { Mic, Send } from "lucide-react";
import { createContext, useContext, useRef } from "react";

import { cn } from "@/lib/utils";

export const ComposerFocusContext = createContext<React.RefObject<HTMLInputElement | null> | null>(
  null,
);

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  lastUserMessage?: string;
  variant?: "dock" | "fullscreen";
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  lastUserMessage,
  variant = "dock",
  placeholder = "Send a message…",
  inputRef: externalInputRef,
}: Props) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const contextRef = useContext(ComposerFocusContext);
  const inputRef = externalInputRef ?? contextRef ?? internalInputRef;

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

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className={cn("flex items-center gap-2", variant === "fullscreen" && "gap-3 max-w-3xl mx-auto")}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Send a message"
          className={cn(
            "w-full bg-secondary border-[1.5px] border-input rounded-full text-sm focus:border-ring outline-none transition-colors disabled:opacity-60",
            variant === "dock" ? "py-2.5 pl-4 pr-12" : "py-3 pl-5 pr-14",
          )}
        />
        <button
          type="button"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors",
            variant === "dock" ? "right-1 w-[30px] h-[30px]" : "right-1.5 w-[34px] h-[34px]",
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
