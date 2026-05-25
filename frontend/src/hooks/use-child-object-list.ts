import { useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import type {
  FilterDefinition,
  ListRequest,
  SortDefinition,
} from "@/lib/resource-table-types";

type ListQuery<T> = (
  params: ListRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => { data: { items: T[]; total: number } | undefined; isFetching: boolean };

interface UseChildObjectListOptions<T> {
  /** Orval-generated list query hook. Same signature as useResourceTable's `listQuery`. */
  listQuery: ListQuery<T>;
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
