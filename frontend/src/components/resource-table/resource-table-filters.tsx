import { useState } from "react";
import { Check, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  ColumnDefinition,
  FilterDefinition,
} from "@/lib/resource-table-types";

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EnumValueList({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<unknown>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const options = column.filterOptions ?? [];
  const current = filters.find(
    (f) => f.column === column.key && f.type === "enum",
  );
  const selected = current?.type === "enum" ? current.values : [];

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onRemove(column.key);
    if (next.length > 0) {
      onAdd({ type: "enum", column: column.key, values: next });
    }
  };

  const sortedOptions = [...options].sort((a, b) =>
    humanize(a).localeCompare(humanize(b)),
  );

  return (
    <div className="flex flex-col gap-0.5">
      {sortedOptions.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {isSelected && <Check className="h-3.5 w-3.5" />}
            </span>
            <span>{humanize(option)}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ResourceTableFiltersProps<T> {
  columns: ColumnDefinition<T>[];
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
  onClearAll?: () => void;
}

export function ResourceTableFilters<T>({
  columns,
  filters,
  onAdd,
  onRemove,
  onClearAll,
}: ResourceTableFiltersProps<T>) {
  const filterableColumns = columns.filter((c) => c.filterType === "enum");
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (filterableColumns.length === 0) return null;

  const activeCount = filters.length;
  const activeCol = filterableColumns.find((c) => c.key === selectedColumn);

  const clearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      filterableColumns.forEach((col) => onRemove(col.key));
    }
  };

  const getActiveCountForColumn = (colKey: string) => {
    const f = filters.find((f) => f.column === colKey && f.type === "enum");
    return f?.type === "enum" ? f.values.length : 0;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelectedColumn(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-border bg-card text-foreground"
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Filter
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-5 rounded-full bg-primary/10 px-1.5 text-xs text-primary"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="end">
        {activeCol ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedColumn(null)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-3 w-3" />
              {activeCol.header}
            </button>
            <div className="border-t" />
            <EnumValueList
              column={activeCol as ColumnDefinition<unknown>}
              filters={filters}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filterableColumns.map((col) => {
              const count = getActiveCountForColumn(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => setSelectedColumn(col.key)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span>{col.header}</span>
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 rounded-full bg-primary/10 px-1.5 text-xs text-primary"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
            {activeCount > 0 && (
              <>
                <div className="my-0.5 border-t" />
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
