import { Navigate, useSearch } from "@tanstack/react-router";
import { useAuthMagicLinkVerifyVerifyMagicLink } from "@/openapi/auth/auth";

export function MagicLinkVerifyPage() {
  const search = useSearch({ from: "/_public/auth/magic-link/verify" });
  const token = search.token;

  const { isSuccess, isError } = useAuthMagicLinkVerifyVerifyMagicLink(
    { token },
    { query: { enabled: !!token, retry: false } },
  );

  if (!token || isError) return <Navigate to="/auth" replace />;
  if (isSuccess) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <p className="font-display text-2xl tracking-wide text-foreground">
        Sloopquest
      </p>
      <p className="text-sm text-muted-foreground">Verifying your link&hellip;</p>
    </div>
  );
}
