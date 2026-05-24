/**
 * Human-readable URL serialization for resource table state.
 *
 * URL format:
 *   enum:    ?state=intake_pending,active
 *   text:    ?name=smith (contains) or ?name=starts_with:smith
 *   date:    ?created_at=2024-01-01..2024-12-31
 *   range:   ?score=10..100
 *   boolean: ?is_active=true
 *   sort:    ?sort=-created_at,name  (- prefix = desc)
 */
import type {
  FilterDefinition,
  FilterType,
  SortDefinition,
} from "@/lib/resource-table-types";

export interface FilterColumnConfig {
  column: string;
  type: FilterType;
}

const TEXT_OPS = ["starts_with", "ends_with", "equals"] as const;

export function serializeFilter(f: FilterDefinition): string {
  switch (f.type) {
    case "enum":
      return f.values.join(",");
    case "text":
      return f.operation === "contains" ? f.value : `${f.operation}:${f.value}`;
    case "date":
      return `${f.start ?? ""}..${f.finish ?? ""}`;
    case "range":
      return `${f.start ?? ""}..${f.finish ?? ""}`;
    case "boolean":
      return String(f.value);
    case "null":
      return f.is_null ? "is_null" : "is_not_null";
  }
}

export function deserializeFilter(
  column: string,
  raw: string,
  type: FilterType,
): FilterDefinition | null {
  if (!raw) return null;

  switch (type) {
    case "enum":
      return { type: "enum", column, values: raw.split(",").filter(Boolean) };
    case "text": {
      for (const op of TEXT_OPS) {
        const prefix = `${op}:`;
        if (raw.startsWith(prefix)) {
          return { type: "text", column, operation: op, value: raw.slice(prefix.length) };
        }
      }
      return { type: "text", column, operation: "contains", value: raw };
    }
    case "date": {
      const [start, finish] = raw.split("..");
      return { type: "date", column, start: start || null, finish: finish || null };
    }
    case "range": {
      const [startStr, finishStr] = raw.split("..");
      return {
        type: "range",
        column,
        start: startStr ? Number(startStr) : null,
        finish: finishStr ? Number(finishStr) : null,
      };
    }
    case "boolean":
      return { type: "boolean", column, value: raw === "true" };
    case "null":
      return { type: "null", column, is_null: raw !== "is_not_null" };
  }
}

export function serializeSorts(sorts: SortDefinition[]): string {
  return sorts
    .map((s) => (s.direction === "desc" ? `-${s.column}` : s.column))
    .join(",");
}

export function deserializeSorts(raw: string): SortDefinition[] {
  if (!raw) return [];
  return raw
    .split(",")
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith("-")) {
        return { column: token.slice(1), direction: "desc" as const };
      }
      return { column: token, direction: "asc" as const };
    });
}

export function prefixKey(prefix: string | undefined, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

export function getParam(
  search: Record<string, unknown>,
  prefix: string | undefined,
  key: string,
): unknown {
  return search[prefixKey(prefix, key)];
}

export function parseFiltersFromUrl(
  search: Record<string, unknown>,
  prefix: string | undefined,
  filterColumns: FilterColumnConfig[],
): FilterDefinition[] {
  const result: FilterDefinition[] = [];
  for (const col of filterColumns) {
    const raw = getParam(search, prefix, col.column);
    if (raw == null || raw === "") continue;
    const f = deserializeFilter(col.column, String(raw), col.type);
    if (f) result.push(f);
  }
  return result;
}

export function parseSortsFromUrl(
  search: Record<string, unknown>,
  prefix: string | undefined,
  defaultSorts: SortDefinition[],
): SortDefinition[] {
  const raw = getParam(search, prefix, "sort");
  if (typeof raw === "string" && raw) return deserializeSorts(raw);
  return defaultSorts;
}
