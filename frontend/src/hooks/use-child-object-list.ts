import { useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import type {
  FilterDefinition,
  ListRequest,
  PagedResponse,
  SortDefinition,
} from "@/lib/resource-table-types";

interface UseChildObjectListOptions<T> {
  /** Orval-generated list query hook. Same signature as useResourceTable's `listQuery`. */
  listQuery: (
    params: ListRequest,
    options?: { query?: { placeholderData?: typeof keepPreviousData } },
  ) => {
    data: PagedResponse<T> | undefined;
    isFetching: boolean;
  };
  /** Pre-applied filters that scope this list. Always sent; not user-removable. */
  filters?: FilterDefinition[];
  /** Default sort. Falls back to `created_at desc`. */
  defaultSorts?: SortDefinition[];
  /** Max items to fetch. Default 100. */
  limit?: number;
}

interface UseChildObjectListReturn<T> {
  items: T[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
}

/**
 * Lightweight data-fetching hook for child object lists.
 * Like `useResourceTable` but with pre-applied/locked filters,
 * no pagination UI, and no URL sync.
 */
export function useChildObjectList<T>(
  options: UseChildObjectListOptions<T>,
): UseChildObjectListReturn<T> {
  const {
    listQuery,
    filters = [],
    defaultSorts = [{ column: "created_at", direction: "desc" }],
    limit = 100,
  } = options;

  const request = useMemo<ListRequest>(
    () => ({ filters, sorts: defaultSorts, limit, offset: 0 }),
    [filters, defaultSorts, limit],
  );

  const { data: rawData, isFetching } = listQuery(request, {
    query: { placeholderData: keepPreviousData },
  });

  return {
    items: rawData?.items ?? [],
    total: rawData?.total ?? 0,
    isLoading: rawData === undefined,
    isFetching,
  };
}
