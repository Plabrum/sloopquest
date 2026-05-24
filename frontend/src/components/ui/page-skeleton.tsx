import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  toolbar = true,
  contentHeight = "400px",
}: {
  toolbar?: boolean;
  contentHeight?: string;
}) {
  return (
    <div className="space-y-4 p-6">
      {toolbar && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      )}
      <Skeleton className="w-full rounded-lg" style={{ height: contentHeight }} />
    </div>
  );
}
