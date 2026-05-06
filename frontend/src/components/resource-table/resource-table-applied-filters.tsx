import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterDefinition, FilterState } from "@/lib/resource-table-types";

function humanize(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFilterDisplayText(filter: FilterDefinition): string {
  const col = humanize(filter.column);

  switch (filter.type) {
    case "text":
      return `${col}: ${filter.operation} "${filter.value}"`;
    case "enum":
      return `${col}: ${filter.values.map(humanize).join(", ")}`;
    case "range": {
      const start = filter.start ?? "∞";
      const finish = filter.finish ?? "∞";
      return `${col}: ${start}–${finish}`;
    }
    case "date": {
      const fmt = (v?: string | null) =>
        v ? new Date(v).toLocaleDateString() : "∞";
      return `${col}: ${fmt(filter.start)}–${fmt(filter.finish)}`;
    }
    case "boolean":
      return `${col}: ${filter.value ? "Yes" : "No"}`;
    case "null":
      return `${col}: ${filter.is_null ? "is empty" : "is set"}`;
  }
}

interface ResourceTableAppliedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function ResourceTableAppliedFilters({
  filters,
  onFiltersChange,
}: ResourceTableAppliedFiltersProps) {
  if (filters.filters.length === 0) return null;

  const handleRemove = (index: number) => {
    onFiltersChange({
      filters: filters.filters.filter((_, i) => i !== index),
    });
  };

  const handleClearAll = () => {
    onFiltersChange({ filters: [] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.filters.map((filter, index) => (
        <Badge
          key={`${filter.column}-${index}`}
          variant="secondary"
          className="gap-1 border-border bg-card text-foreground"
        >
          {getFilterDisplayText(filter)}
          <button
            type="button"
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => handleRemove(index)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove filter</span>
          </button>
        </Badge>
      ))}
      {filters.filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
