import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  statusVariantClasses,
  statusSolidClasses,
  statusDotClasses,
  type StatusVariant,
} from "@/lib/status-colors";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
  showDot?: boolean;
  tone?: "subtle" | "solid";
}

export function StatusBadge({
  status,
  size = "default",
  showDot = true,
  tone = "subtle",
}: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const isSolid = tone === "solid";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium tracking-wide uppercase",
        isSolid
          ? statusSolidClasses[config.variant]
          : statusVariantClasses[config.variant],
        size === "sm"
          ? "gap-1.5 px-2 py-0.5 text-[11px] leading-none"
          : "gap-2 px-3 py-1 text-xs",
      )}
    >
      {showDot && !isSolid && (
        <span
          className={cn(
            "rounded-full",
            statusDotClasses[config.variant],
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
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
