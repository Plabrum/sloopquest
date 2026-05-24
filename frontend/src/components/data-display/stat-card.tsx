import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardColor = "blue" | "green" | "red" | "yellow";

interface StatCardProps {
  value: string | number;
  label: string;
  change?: { value: number; direction: "up" | "down" | "flat" };
  color?: StatCardColor;
  href?: string;
  className?: string;
}

interface StatCardsProps {
  stats: StatCardProps[];
  className?: string;
}

function StatCard({ value, label, change, href, className }: StatCardProps) {
  const card = (
    <div
      className={cn(
        "group rounded-[var(--radius-lg)] border border-border bg-card px-5 py-4 transition-colors",
        href && "hover:border-foreground/30",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {change && change.direction !== "flat" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
              change.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {change.direction === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

export function StatCards({ stats, className }: StatCardsProps) {
  return (
    <div
      className={cn("grid gap-3", className)}
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export { StatCard };
export type { StatCardProps, StatCardsProps, StatCardColor };
