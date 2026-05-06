/**
 * Shared layout for any public-facing page that uses the auth-style
 * gradient background — sign-in, magic-link verify, invite accept,
 * 404/403/500 error pages. Owns the wordmark + copyright so changes
 * to branding live in one place.
 */
export function PublicAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-auth flex min-h-svh flex-col items-center justify-center px-4 py-6">
      <div className="mb-10 flex flex-col items-center text-center">
        <span className="font-display text-3xl font-normal tracking-tight text-foreground">
          Sloopquest
        </span>
      </div>
      {children}
      <p className="mt-6 text-xs text-muted-foreground/60">
        &copy; 2026 Sloopquest, Inc.
      </p>
    </div>
  );
}
