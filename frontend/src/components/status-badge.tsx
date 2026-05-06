import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  statusVariantClasses,
  statusDotClasses,
  type StatusVariant,
} from "@/lib/status-colors";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
  showDot?: boolean;
}

export function StatusBadge({ status, size = "default", showDot = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        statusVariantClasses[config.variant],
        size === "sm"
          ? "gap-1 px-1.5 py-px text-[11px] leading-tight"
          : "gap-2 px-3 py-1 text-xs",
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full",
            statusDotClasses[config.variant],
            size === "sm" ? "h-1 w-1" : "h-2 w-2",
          )}
        />
      )}
      {config.label}
    </span>
  );
}

export function StatusDot({
  variant,
  className,
}: {
  variant: StatusVariant;
  className?: string;
}) {
  return (
    <span
      className={cn("h-2 w-2 rounded-full", statusDotClasses[variant], className)}
    />
  );
}
