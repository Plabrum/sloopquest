interface WidgetSkeletonProps {
  cols: number;
}

export function WidgetSkeleton({ cols }: WidgetSkeletonProps) {
  const height = cols === 1 ? "h-28" : "h-56";
  return <div className={`animate-pulse rounded-2xl bg-muted ${height}`} />;
}
