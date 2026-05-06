/**
 * Empty-state quick-prompt chips.
 *
 * Renders only when the conversation is empty. Clicking a chip fills the
 * composer (does NOT auto-send) so the user can edit before submitting.
 */
const DEFAULT_PROMPTS = [
  "What do I need to do today?",
  "What's on my schedule?",
  "Show me recent activity",
] as const;

type Props = {
  prompts?: ReadonlyArray<string>;
  onPick: (prompt: string) => void;
};

export function QuickPrompts({ prompts = DEFAULT_PROMPTS, onPick }: Props) {
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[420px]">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPick(prompt)}
          className="text-left text-xs text-muted-foreground bg-secondary hover:bg-secondary/70 border border-input rounded-full px-3 py-1.5 transition-colors"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
