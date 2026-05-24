import { useState } from "react";
import { Check, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, humanize } from "@/lib/utils";
import type {
  BooleanFilter,
  ColumnDefinition,
  DateFilter,
  EnumFilter,
  FilterDefinition,
  NullFilter,
  RangeFilter,
  TextFilter,
} from "@/lib/resource-table-types";


// ---------------------------------------------------------------------------
// Per-type filter panels
// ---------------------------------------------------------------------------

function EnumFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const options = column.filterOptions ?? [];
  const current = filters.find((f) => f.column === column.key && f.type === "enum") as EnumFilter | undefined;
  const selected = current?.values ?? [];

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onRemove(column.key);
    if (next.length > 0) {
      onAdd({ type: "enum", column: column.key, values: next });
    }
  };

  const sorted = [...options].sort((a, b) => humanize(a).localeCompare(humanize(b)));

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((option) => {
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

function BooleanFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const current = filters.find((f) => f.column === column.key && f.type === "boolean") as BooleanFilter | undefined;
  const value = current?.value;

  const select = (v: boolean) => {
    onRemove(column.key);
    if (value !== v) {
      onAdd({ type: "boolean", column: column.key, value: v });
    }
  };

  return (
    <div className="flex gap-2 px-1 py-0.5">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => select(v)}
          className={cn(
            "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === v
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-accent",
          )}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function NullFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const current = filters.find((f) => f.column === column.key && f.type === "null") as NullFilter | undefined;
  const isNull = current?.is_null;

  const select = (v: boolean) => {
    onRemove(column.key);
    if (isNull !== v) {
      onAdd({ type: "null", column: column.key, is_null: v });
    }
  };

  return (
    <div className="flex gap-2 px-1 py-0.5">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => select(v)}
          className={cn(
            "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
            isNull === v
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-accent",
          )}
        >
          {v ? "Is empty" : "Is set"}
        </button>
      ))}
    </div>
  );
}

function TextFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const current = filters.find((f) => f.column === column.key && f.type === "text") as TextFilter | undefined;
  const [operation, setOperation] = useState<TextFilter["operation"]>(current?.operation ?? "contains");
  const [value, setValue] = useState(current?.value ?? "");

  const apply = (op: TextFilter["operation"], val: string) => {
    onRemove(column.key);
    if (val.trim()) {
      onAdd({ type: "text", column: column.key, operation: op, value: val.trim() });
    }
  };

  return (
    <div className="flex flex-col gap-2 px-1 py-0.5">
      <Select
        value={operation}
        onValueChange={(v) => {
          const op = v as TextFilter["operation"];
          setOperation(op);
          apply(op, value);
        }}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contains">Contains</SelectItem>
          <SelectItem value="starts_with">Starts with</SelectItem>
          <SelectItem value="ends_with">Ends with</SelectItem>
          <SelectItem value="equals">Equals</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="h-8 text-sm"
        placeholder="Value…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(operation, value);
        }}
        onBlur={() => apply(operation, value)}
      />
    </div>
  );
}

function DateFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const current = filters.find((f) => f.column === column.key && f.type === "date") as DateFilter | undefined;
  const [start, setStart] = useState(current?.start ?? "");
  const [finish, setFinish] = useState(current?.finish ?? "");

  const apply = (s: string, f: string) => {
    onRemove(column.key);
    if (s || f) {
      onAdd({ type: "date", column: column.key, start: s || null, finish: f || null });
    }
  };

  return (
    <div className="flex flex-col gap-2 px-1 py-0.5">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">From</span>
        <Input
          type="date"
          className="h-8 text-sm"
          value={start}
          onChange={(e) => { setStart(e.target.value); apply(e.target.value, finish); }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">To</span>
        <Input
          type="date"
          className="h-8 text-sm"
          value={finish}
          onChange={(e) => { setFinish(e.target.value); apply(start, e.target.value); }}
        />
      </div>
    </div>
  );
}

function RangeFilterPanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  const current = filters.find((f) => f.column === column.key && f.type === "range") as RangeFilter | undefined;
  const [start, setStart] = useState(current?.start != null ? String(current.start) : "");
  const [finish, setFinish] = useState(current?.finish != null ? String(current.finish) : "");

  const apply = (s: string, f: string) => {
    onRemove(column.key);
    const startNum = s !== "" ? Number(s) : null;
    const finishNum = f !== "" ? Number(f) : null;
    if (startNum != null || finishNum != null) {
      onAdd({ type: "range", column: column.key, start: startNum, finish: finishNum });
    }
  };

  return (
    <div className="flex flex-col gap-2 px-1 py-0.5">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="h-8 text-sm"
          placeholder="Min"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => apply(start, finish)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(start, finish); }}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          className="h-8 text-sm"
          placeholder="Max"
          value={finish}
          onChange={(e) => setFinish(e.target.value)}
          onBlur={() => apply(start, finish)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(start, finish); }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch to the right panel
// ---------------------------------------------------------------------------

function FilterValuePanel<T>({
  column,
  filters,
  onAdd,
  onRemove,
}: {
  column: ColumnDefinition<T>;
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
}) {
  switch (column.filterType) {
    case "enum":
      return <EnumFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    case "boolean":
      return <BooleanFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    case "null":
      return <NullFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    case "text":
      return <TextFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    case "date":
      return <DateFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    case "range":
      return <RangeFilterPanel column={column} filters={filters} onAdd={onAdd} onRemove={onRemove} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main filter popover
// ---------------------------------------------------------------------------

interface ResourceTableFiltersProps<T> {
  columns: ColumnDefinition<T>[];
  filters: FilterDefinition[];
  onAdd: (filter: FilterDefinition) => void;
  onRemove: (column: string) => void;
  onClearAll?: () => void;
}

// Wider popover for filter types that need input fields
const WIDE_FILTER_TYPES = new Set(["text", "date", "range"]);

export function ResourceTableFilters<T>({
  columns,
  filters,
  onAdd,
  onRemove,
  onClearAll,
}: ResourceTableFiltersProps<T>) {
  const filterableColumns = columns.filter((c) => c.filterType != null);
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
    return filters.filter((f) => f.column === colKey).length;
  };

  const isWide = activeCol != null && WIDE_FILTER_TYPES.has(activeCol.filterType ?? "");

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
      <PopoverContent
        className={cn("p-1.5 transition-none", isWide ? "w-64" : "w-52")}
        align="end"
      >
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
            <FilterValuePanel
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
