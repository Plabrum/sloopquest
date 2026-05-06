/**
 * Types for the ResourceTable system.
 * Mirrors the backend CRUD types (ListRequest, PagedResponse, FilterDefinition, SortDefinition).
 * Tag values match backend app/base/filters.py FilterType enum.
 */

export interface TextFilter {
  type: "text";
  column: string;
  operation: "contains" | "starts_with" | "ends_with" | "equals";
  value: string;
}

export interface EnumFilter {
  type: "enum";
  column: string;
  values: string[];
}

export interface RangeFilter {
  type: "range";
  column: string;
  start?: number | null;
  finish?: number | null;
}

export interface DateFilter {
  type: "date";
  column: string;
  start?: string | null;
  finish?: string | null;
}

export interface BooleanFilter {
  type: "boolean";
  column: string;
  value: boolean;
}

export interface NullFilter {
  type: "null";
  column: string;
  /** True → column IS NULL; false → column IS NOT NULL. */
  is_null: boolean;
}

export type FilterDefinition =
  | TextFilter
  | EnumFilter
  | RangeFilter
  | DateFilter
  | BooleanFilter
  | NullFilter;

export type SortDirection = "asc" | "desc";

export interface SortDefinition {
  column: string;
  direction: SortDirection;
}

export interface ListRequest {
  filters: FilterDefinition[];
  sorts: SortDefinition[];
  search?: string | null;
  limit: number;
  offset: number;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export type FilterType = "text" | "enum" | "range" | "date" | "boolean" | "null";

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
  /** If set, ResourceTable renders a filter control for this column in the toolbar. */
  filterType?: FilterType;
  /** For enum filters: the available values to choose from. */
  filterOptions?: string[];
}

/** Aggregate filter state passed to/from ResourceTable */
export interface FilterState {
  filters: FilterDefinition[];
}

/** Aggregate sort state passed to/from ResourceTable */
export interface SortState {
  sorts: SortDefinition[];
}

export interface ResourceTableProps<T extends { id: string | number }> {
  data: PagedResponse<T>;
  columns: ColumnDefinition<T>[];

  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  sorts?: SortState;
  onSortsChange?: (sorts: SortState) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;

  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  showPagination?: boolean;

  topLevelActions?: React.ReactNode;
  onRowClick?: (item: T) => void;

  resourceName?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;

  /** Highlight a specific row by its id (e.g. when navigating from a linked resource). */
  highlightId?: string | number;

  /**
   * Inline row expansion. When provided alongside `expandedId`,
   * renders the result of `renderRowExpansion(row)` as a full-width cell
   * directly below the matched row. Pair with `onRowClick` to drive the
   * expand/collapse from the row click handler.
   */
  expandedId?: string | number | null;
  renderRowExpansion?: (item: T) => React.ReactNode;

  classNames?: {
    header?: string;
    row?: string;
  };
}
