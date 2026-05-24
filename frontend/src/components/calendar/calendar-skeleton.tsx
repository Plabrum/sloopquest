import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
      {Array.from({ length: 42 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-none bg-background" />
      ))}
    </div>
  );
}
