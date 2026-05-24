import type { InboxView } from "@/router/authenticated.routes";
import { cn } from "@/lib/utils";

const CHIPS: { value: InboxView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "sent", label: "Sent" },
  { value: "archived", label: "Archived" },
];

interface Props {
  value: InboxView;
  onChange: (next: InboxView) => void;
}

export function FilterChips({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHIPS.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === chip.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
