import { useQuery } from "@tanstack/react-query";
import { authMeQueryOptions } from "@/lib/auth-loader";

/**
 * Subscribes a component to the `/auth/me` cache without issuing a
 * fetch. Use in places (router-level error / 404 components) that
 * render outside the authenticated layout but still need to know
 * whether a session is in flight.
 *
 * `enabled: false` skips the network request but DOES register the
 * cache observer — so when `requireAuth()` populates the cache, any
 * component using this hook re-renders with the fresh value. A bare
 * `queryClient.getQueryData()` is a one-shot snapshot and leaves the
 * component frozen at mount-time state.
 */
export function useIsAuthenticated(): boolean {
  const { data } = useQuery({
    ...authMeQueryOptions,
    enabled: false,
  });
  return data != null;
}
