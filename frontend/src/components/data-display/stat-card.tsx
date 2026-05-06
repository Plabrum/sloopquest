import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardColor = "blue" | "green" | "red" | "yellow";

interface StatCardProps {
  value: string | number;
  label: string;
  change?: { value: number; direction: "up" | "down" | "flat" };
  color: StatCardColor;
  href?: string;
  className?: string;
}

interface StatCardsProps {
  stats: StatCardProps[];
  className?: string;
}

const COLOR_MAP: Record<StatCardColor, { bg: string; border: string; text: string }> = {
  blue:   { bg: "#EFF6FF", border: "#3B82F640", text: "#3B82F6" },
  green:  { bg: "#EFF5F1", border: "#4A8C3F40", text: "#4A8C3F" },
  red:    { bg: "#FEF2F2", border: "#C45A4A40", text: "#C45A4A" },
  yellow: { bg: "#FDF3E7", border: "#D4944A40", text: "#D4944A" },
};

function StatCard({ value, label, change, color, href, className }: StatCardProps) {
  const colors = COLOR_MAP[color];

  const content = (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-2xl p-5 shadow-lg transition-shadow",
        href && "hover:shadow-xl",
        className,
      )}
      style={{
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: colors.border,
      }}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="font-display text-[28px] font-bold leading-tight"
          style={{ color: colors.text }}
        >
          {value}
        </span>
        {change && change.direction !== "flat" && (
          <span
            className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: colors.text }}
          >
            {change.direction === "up" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>
      <span className="text-sm font-medium" style={{ color: colors.text }}>
        {label}
      </span>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

export function StatCards({ stats, className }: StatCardsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-4", className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export { StatCard };
export type { StatCardProps, StatCardsProps, StatCardColor };
