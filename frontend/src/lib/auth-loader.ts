import { redirect } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { queryClient } from "@/lib/query-client";
import { customInstance } from "@/openapi/custom-instance";

type AuthRedirectReason = "session-expired";

export type AuthUser = {
  id: string;
  email: string;
  [key: string]: unknown;
};

export const authMeQueryKey = ["auth", "me"] as const;

export const authMeQueryOptions = {
  queryKey: authMeQueryKey,
  queryFn: () => customInstance<AuthUser>({ url: "/auth/me", method: "GET" }),
  staleTime: Infinity,
};

function redirectToAuth(reason?: AuthRedirectReason): never {
  throw redirect({
    to: "/auth",
    replace: true,
    search: reason ? { reason } : {},
  });
}

export async function requireAuth() {
  const hadSession = queryClient.getQueryData(authMeQueryKey) != null;
  const reason: AuthRedirectReason | undefined = hadSession
    ? "session-expired"
    : undefined;

  try {
    const user = await queryClient.ensureQueryData(authMeQueryOptions);
    return { user };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      queryClient.clear();
      redirectToAuth(reason);
    }
    queryClient.clear();
    redirectToAuth();
  }
}
