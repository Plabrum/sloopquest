import { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional custom rendering for the list row (e.g. colored badge). Falls back to label. */
  renderOption?: React.ReactNode;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: ComboboxOption[];
  placeholder?: string;
  /** Custom renderer for the value shown inside the closed trigger. Defaults to the matched suggestion's label (or raw value). */
  renderValue?: (value: string) => React.ReactNode;
  triggerClassName?: string;
  /** Input placeholder inside the popover. */
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Allow committing arbitrary typed text when no suggestion matches. Default true. Set false for entity pickers where only valid IDs are acceptable. */
  allowFreeform?: boolean;
  /** Called with the current search input when the user clicks the inline create row. Only shown when input is non-empty and no suggestions match. */
  onCreateOption?: (value: string) => void;
  /** Label prefix for the create row. Defaults to "Create". */
  createLabel?: string;
}

function humanize(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function Combobox({
  value,
  onChange,
  suggestions,
  placeholder = "Select…",
  renderValue,
  triggerClassName,
  searchPlaceholder = "Type or select…",
  disabled = false,
  allowFreeform = true,
  onCreateOption,
  createLabel = "Create",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q),
    );
  }, [suggestions, input]);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const hit = suggestions.find((s) => s.value === value);
    return hit?.label ?? humanize(value);
  }, [value, suggestions]);

  const commit = (next: string) => {
    const normalized = next.trim();
    if (!normalized) return;
    onChange(normalized);
    setOpen(false);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[highlight];
      if (target) {
        commit(target.value);
      } else if (input.trim() && allowFreeform) {
        commit(input);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setInput("");
          setHighlight(0);
          // Focus the search input after Radix opens the popover
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-primary/[0.07] px-3 py-2 text-left text-sm text-foreground shadow-xs transition-colors hover:bg-primary/[0.1] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center truncate">
            {value ? (
              renderValue ? (
                renderValue(value)
              ) : (
                <span className="truncate">{selectedLabel}</span>
              )
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <ScrollArea maxHeight="240px">
            <ul className="p-1">
              {filtered.map((opt, i) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground",
                      highlight === i && "bg-primary/10",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {opt.renderOption ?? opt.label}
                    </span>
                    {value === opt.value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && input.trim() && allowFreeform && (
                <li>
                  <button
                    type="button"
                    onClick={() => commit(input)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-primary/10"
                  >
                    <span className="text-muted-foreground">Use</span>
                    <span className="truncate font-medium">{input.trim()}</span>
                  </button>
                </li>
              )}
              {filtered.length === 0 && input.trim() && onCreateOption && (
                <li>
                  <button
                    type="button"
                    onClick={() => { onCreateOption(input.trim()); setOpen(false); setInput(""); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-primary/10"
                  >
                    <span className="text-muted-foreground">{createLabel}</span>
                    <span className="truncate font-medium">{input.trim()}</span>
                  </button>
                </li>
              )}
              {filtered.length === 0 && !input.trim() && (
                <li className="px-2 py-1.5 text-[13px] text-muted-foreground">
                  No suggestions
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
