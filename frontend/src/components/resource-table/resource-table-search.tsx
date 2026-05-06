import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResourceTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function ResourceTableSearch({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
}: ResourceTableSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmed = localValue.trim();
      if (trimmed !== value) {
        onChange(trimmed);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full border-border bg-card pl-9 pr-8 focus-visible:border-primary/40 focus-visible:ring-primary/20"
        aria-label={placeholder}
      />
      {localValue.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
        >
          <span className="sr-only">Clear search</span>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
