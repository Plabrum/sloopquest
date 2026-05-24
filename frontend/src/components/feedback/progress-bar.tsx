import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  valueLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
}

const FILL_COLORS = {
  success: "#A7D5B8",
  warning: "#F4B183",
  danger: "#E88B8B",
} as const;

function resolveFillColor(variant: ProgressBarProps["variant"], ratio: number): string {
  if (variant && variant !== "default") return FILL_COLORS[variant];
  if (ratio >= 0.75) return FILL_COLORS.success;
  if (ratio >= 0.5) return FILL_COLORS.warning;
  return FILL_COLORS.danger;
}

export function ProgressBar({
  value,
  max,
  label,
  valueLabel,
  variant = "default",
  size = "md",
  className,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const isComplete = value >= max;
  const fillColor = resolveFillColor(variant, ratio);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="font-display text-[13px] font-semibold text-foreground">
              {label}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {valueLabel && (
              <span className="text-[13px] font-medium text-muted-foreground">
                {valueLabel}
              </span>
            )}
            {isComplete && (
              <Check className="size-3.5 text-[#4A8C3F]" strokeWidth={2.5} />
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[#EDECEA]",
          size === "sm" ? "h-1" : "h-2",
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${ratio * 100}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}

export type { ProgressBarProps };
