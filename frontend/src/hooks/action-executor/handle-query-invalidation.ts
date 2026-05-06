import type { QueryClient } from "@tanstack/react-query";

type WithInvalidateQueries = { invalidate_queries?: string[] | null };

/**
 * Predicate-based invalidation matches both list and stats queries that
 * share the same first key segment, so a single backend hint flushes
 * everything derived from it.
 */
export function handleQueryInvalidation(
  queryClient: QueryClient,
  response: WithInvalidateQueries,
  onInvalidate?: (queryClient: QueryClient, backendQueryKeys: string[]) => void,
): void {
  const backendQueryKeys = response.invalidate_queries || [];

  if (backendQueryKeys.length > 0) {
    backendQueryKeys.forEach((key) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          (query.queryKey[0] === key || query.queryKey[0].includes(key)),
      });
    });
  }

  if (onInvalidate) {
    onInvalidate(queryClient, backendQueryKeys);
  }
}
