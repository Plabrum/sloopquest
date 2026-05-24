import { Suspense, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { ComponentErrorBoundary } from "@/components/component-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

type ErrorFallback = (error: unknown, retry: () => void) => ReactNode;

interface QueryBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode | ErrorFallback;
  resetKey?: unknown;
}

export function QueryBoundary({
  children,
  fallback,
  errorFallback,
  resetKey,
}: QueryBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ComponentErrorBoundary
          resetKey={resetKey}
          fallback={(error, clear) => {
            const retry = () => {
              reset();
              clear();
            };
            if (typeof errorFallback === "function") return errorFallback(error, retry);
            if (errorFallback !== undefined) return errorFallback;
            return <DefaultErrorFallback onRetry={retry} />;
          }}
        >
          <Suspense fallback={fallback ?? <DefaultLoadingFallback />}>{children}</Suspense>
        </ComponentErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function DefaultLoadingFallback() {
  return (
    <div className="p-6">
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function DefaultErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card p-8 text-center">
      <AlertTriangle className="mb-3 size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Something went wrong</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This section failed to load. The rest of the page is still available.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 text-xs font-medium text-primary hover:underline"
      >
        Retry
      </button>
    </div>
  );
}
