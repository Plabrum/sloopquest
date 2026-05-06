import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { keepPreviousData } from "@tanstack/react-query";
import type {
  ColumnDefinition,
  FilterDefinition,
  FilterState,
  ListRequest,
  PagedResponse,
  SortDefinition,
  SortState,
} from "@/lib/resource-table-types";
import type { FilterColumnConfig } from "@/lib/url-filters";
import {
  getParam,
  parseFiltersFromUrl,
  parseSortsFromUrl,
  prefixKey,
  serializeFilter,
  serializeSorts,
} from "@/lib/url-filters";

interface UseResourceTableOptions<T> {
  /** The Orval-generated query hook for this resource's list endpoint.
   *  `keepPreviousData` is applied internally so filter/sort/page changes
   *  show stale data instead of a skeleton. */
  listQuery: (
    params: ListRequest,
    options?: { query?: { placeholderData?: typeof keepPreviousData } },
  ) => {
    data: PagedResponse<T> | undefined;
    isFetching: boolean;
  };
  /** Filters always prepended to the request (e.g. scoping to a parent entity).
   *  These are not user-removable and do not appear in the URL. */
  baseFilters?: FilterDefinition[];
  /**
   * Column definitions for the table. When provided, filter columns are
   * derived automatically from columns that have a `filterType` set.
   */
  columns?: ColumnDefinition<T>[];
  /**
   * Explicit filter column config. Overrides auto-derivation from `columns`.
   */
  filterColumns?: FilterColumnConfig[];
  /** Default sort order when no sort is active */
  defaultSorts?: SortDefinition[];
  /** Rows per page. Default 25. Clamped to [1, 200]. */
  pageSize?: number;
  /**
   * URL search param prefix. Allows multiple ResourceTables on one page
   * without colliding (e.g. prefix="claims" → "claims_page", "claims_q").
   */
  paramPrefix?: string;
}

interface UseResourceTableReturn<T> {
  data: PagedResponse<T>;

  /** True on the very first fetch (no cached data yet) */
  isLoading: boolean;
  /** True whenever a fetch is in-flight (including background refetches) */
  isFetching: boolean;

  filters: FilterDefinition[];
  setFilters: (filters: FilterDefinition[]) => void;
  addFilter: (filter: FilterDefinition) => void;
  removeFilter: (column: string) => void;
  clearFilters: () => void;

  sorts: SortDefinition[];
  setSorts: (sorts: SortDefinition[]) => void;
  toggleSort: (column: string) => void;

  searchQuery: string;
  setSearch: (query: string) => void;

  page: number;
  setPage: (page: number) => void;
  totalPages: number;

  /** Spread-friendly object for ResourceTable props */
  tableProps: {
    data: PagedResponse<T>;
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    sorts: SortState;
    onSortsChange: (sorts: SortState) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    page: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    loading: boolean;
  };
}

export function useResourceTable<T>(
  options: UseResourceTableOptions<T>,
): UseResourceTableReturn<T> {
  const {
    listQuery,
    baseFilters,
    columns: columnDefs,
    filterColumns: explicitFilterColumns,
    defaultSorts = [],
    pageSize: rawPageSize = 25,
    paramPrefix,
  } = options;

  const filterColumns = useMemo<FilterColumnConfig[]>(() => {
    if (explicitFilterColumns) return explicitFilterColumns;
    if (!columnDefs) return [];
    return columnDefs
      .filter((c) => c.filterType)
      .map((c) => ({ column: c.key, type: c.filterType! }));
  }, [explicitFilterColumns, columnDefs]);

  const pageSize = Math.max(1, Math.min(200, rawPageSize));
  const navigate = useNavigate();

  const search = useSearch({ strict: false }) as Record<string, unknown>;

  const page = Math.max(1, Number(getParam(search, paramPrefix, "page")) || 1);
  const searchQuery = String(getParam(search, paramPrefix, "q") ?? "");
  const filters = useMemo(
    () => parseFiltersFromUrl(search, paramPrefix, filterColumns),
    [search, paramPrefix, filterColumns],
  );
  const sorts = useMemo(
    () => parseSortsFromUrl(search, paramPrefix, defaultSorts),
    [search, paramPrefix, defaultSorts],
  );

  const updateSearchParams = useCallback(
    (updates: Record<string, unknown>) => {
      navigate({
        search: ((prev: Record<string, unknown>) => {
          const next = { ...prev };
          for (const [key, value] of Object.entries(updates)) {
            const paramKey = prefixKey(paramPrefix, key);
            if (value === undefined || value === null || value === "" || value === 1) {
              delete next[paramKey];
            } else {
              next[paramKey] = value;
            }
          }
          return next;
        }) as unknown as true,
        replace: true,
      });
    },
    [navigate, paramPrefix],
  );

  const writeFiltersToUrl = useCallback(
    (nextFilters: FilterDefinition[]) => {
      const updates: Record<string, unknown> = { page: undefined };
      for (const col of filterColumns) {
        const f = nextFilters.find((nf) => nf.column === col.column);
        updates[col.column] = f ? serializeFilter(f) : undefined;
      }
      updateSearchParams(updates);
    },
    [filterColumns, updateSearchParams],
  );

  const setPage = useCallback(
    (p: number) => updateSearchParams({ page: p }),
    [updateSearchParams],
  );

  const setSearch = useCallback(
    (q: string) => updateSearchParams({ q, page: undefined }),
    [updateSearchParams],
  );

  const setFilters = useCallback(
    (f: FilterDefinition[]) => writeFiltersToUrl(f),
    [writeFiltersToUrl],
  );

  const addFilter = useCallback(
    (filter: FilterDefinition) => {
      const next = filters.some((f) => f.column === filter.column)
        ? filters.map((f) => (f.column === filter.column ? filter : f))
        : [...filters, filter];
      writeFiltersToUrl(next);
    },
    [filters, writeFiltersToUrl],
  );

  const removeFilter = useCallback(
    (column: string) => {
      writeFiltersToUrl(filters.filter((f) => f.column !== column));
    },
    [filters, writeFiltersToUrl],
  );

  const clearFilters = useCallback(() => {
    writeFiltersToUrl([]);
  }, [writeFiltersToUrl]);

  const setSorts = useCallback(
    (s: SortDefinition[]) => {
      updateSearchParams({
        sort: s.length > 0 ? serializeSorts(s) : undefined,
      });
    },
    [updateSearchParams],
  );

  const toggleSort = useCallback(
    (column: string) => {
      const existing = sorts.find((s) => s.column === column);
      let next: SortDefinition[];
      if (!existing) next = [{ column, direction: "asc" }];
      else if (existing.direction === "asc") next = [{ column, direction: "desc" }];
      else next = [];
      updateSearchParams({
        sort: next.length > 0 ? serializeSorts(next) : undefined,
      });
    },
    [sorts, updateSearchParams],
  );

  const listRequest: ListRequest = useMemo(
    () => ({
      filters: [...(baseFilters ?? []), ...filters],
      sorts,
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [baseFilters, filters, sorts, searchQuery, pageSize, page],
  );

  const { data: rawData, isFetching } = listQuery(
    listRequest,
    { query: { placeholderData: keepPreviousData } },
  );

  const emptyResponse = useMemo<PagedResponse<T>>(
    () => ({ items: [], total: 0, offset: 0, limit: pageSize, has_more: false }),
    [pageSize],
  );
  const data = rawData ?? emptyResponse;
  const isLoading = rawData === undefined;

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const onFiltersChange = useCallback(
    (fs: FilterState) => setFilters(fs.filters),
    [setFilters],
  );

  const onSortsChange = useCallback(
    (ss: SortState) => setSorts(ss.sorts),
    [setSorts],
  );

  const tableProps = useMemo(
    () => ({
      data,
      filters: { filters } as FilterState,
      onFiltersChange,
      sorts: { sorts } as SortState,
      onSortsChange,
      searchQuery,
      onSearchChange: setSearch,
      page,
      onPageChange: setPage,
      pageSize,
      loading: isFetching,
    }),
    [
      data,
      filters,
      onFiltersChange,
      sorts,
      onSortsChange,
      searchQuery,
      setSearch,
      page,
      setPage,
      pageSize,
      isFetching,
    ],
  );

  return {
    data,
    isLoading,
    isFetching,
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    sorts,
    setSorts,
    toggleSort,
    searchQuery,
    setSearch,
    page,
    setPage,
    totalPages,
    tableProps,
  };
}
