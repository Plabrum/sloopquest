import type { ColumnDefinition, FilterType } from "@/lib/resource-table-types";

export type DisplayType =
  | "text"
  | "enum"
  | "status"
  | "date"
  | "datetime"
  | "number"
  | "currency"
  | "boolean"
  | "duration";

const DISPLAY_TO_FILTER: Record<DisplayType, FilterType> = {
  text: "text",
  enum: "enum",
  status: "enum",
  date: "date",
  datetime: "date",
  number: "range",
  currency: "range",
  boolean: "boolean",
  duration: "range",
};

interface ColumnConfig {
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  hideOnMobile?: boolean;
  options?: string[];
  className?: string;
}

interface ColumnEntry<T> {
  key: keyof T & string;
  displayType: DisplayType;
  config: ColumnConfig;
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Date-only strings (`YYYY-MM-DD`) shipped by the backend's `format: 'date'`
// fields: parsed by `new Date(...)` as UTC midnight, which shifts to the
// previous day in any zone west of UTC when re-rendered via
// `toLocaleDateString`. Detect that pattern and construct in local zone.
const _DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(value: unknown): string {
  if (value == null) return "—";
  const s = String(value);
  const date = _DATE_ONLY_RE.test(s)
    ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
    : new Date(s);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Parse an ISO 8601 duration (e.g. "PT1500S", "PT25M", "PT1H30M") to total minutes. */
function parseDurationMinutes(value: unknown): number {
  if (value == null) return 0;
  const s = String(value);
  const match = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function formatDuration(value: unknown): string {
  const totalMinutes = parseDurationMinutes(value);
  if (totalMinutes === 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function defaultRenderer<T>(entry: ColumnEntry<T>): (item: T) => React.ReactNode {
  const { key, displayType } = entry;

  return (item: T) => {
    const value = (item as Record<string, unknown>)[key];
    if (value == null) return <span className="text-muted-foreground">—</span>;

    switch (displayType) {
      case "status":
      case "enum":
        return <span className="block truncate">{humanize(String(value))}</span>;
      case "date":
      case "datetime":
        return <span className="block truncate">{formatDate(value)}</span>;
      case "number":
        return (
          <span className="block truncate tabular-nums">
            {Number(value).toLocaleString()}
          </span>
        );
      case "currency":
        return (
          <span className="block truncate tabular-nums">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(Number(value))}
          </span>
        );
      case "duration":
        return (
          <span className="block truncate tabular-nums">{formatDuration(value)}</span>
        );
      case "boolean":
        return value ? "Yes" : "No";
      case "text":
      default:
        return <span className="block truncate">{String(value)}</span>;
    }
  };
}

export class ColumnBuilder<T> {
  private entries: ColumnEntry<T>[] = [];

  private add(key: keyof T & string, displayType: DisplayType, config: ColumnConfig): this {
    this.entries.push({ key, displayType, config });
    return this;
  }

  text(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "text", config);
  }

  enum(key: keyof T & string, config: ColumnConfig & { options: string[] }): this {
    return this.add(key, "enum", config);
  }

  status(key: keyof T & string, config: ColumnConfig & { options: string[] }): this {
    return this.add(key, "status", config);
  }

  date(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "date", config);
  }

  datetime(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "datetime", config);
  }

  number(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "number", config);
  }

  currency(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "currency", config);
  }

  boolean(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "boolean", config);
  }

  duration(key: keyof T & string, config: ColumnConfig): this {
    return this.add(key, "duration", config);
  }

  /** Return a new builder with only the specified columns, in the given order. */
  only(keys: (keyof T & string)[]): ColumnBuilder<T> {
    const next = new ColumnBuilder<T>();
    for (const key of keys) {
      const entry = this.entries.find((e) => e.key === key);
      if (entry) next.entries.push(entry);
    }
    return next;
  }

  /** Finalize with default renderers for all columns. */
  build(): ColumnDefinition<T>[] {
    return this.withRenderers();
  }

  /** Finalize with optional per-column render overrides. */
  withRenderers(
    overrides?: Partial<Record<keyof T & string, (item: T) => React.ReactNode>>,
  ): ColumnDefinition<T>[] {
    return this.entries.map((entry) => ({
      key: entry.key,
      header: entry.config.header,
      sortable: entry.config.sortable,
      className: entry.config.className,
      hideOnMobile: entry.config.hideOnMobile,
      filterType: entry.config.filterable
        ? DISPLAY_TO_FILTER[entry.displayType]
        : undefined,
      filterOptions: entry.config.options,
      render: overrides?.[entry.key] ?? defaultRenderer(entry),
    }));
  }
}

export function createColumnBuilder<T>(): ColumnBuilder<T> {
  return new ColumnBuilder<T>();
}
