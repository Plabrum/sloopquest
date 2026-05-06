import { cn } from "@/lib/utils";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface MetricBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarData[];
  valuePrefix?: string;
  valueSuffix?: string;
  defaultBarColor?: string;
  className?: string;
}

const BAR_GREEN = "#A7D5B8";
const BAR_ORANGE = "#F4B183";

function defaultColorForBar(value: number, max: number): string {
  return value / max >= 0.5 ? BAR_GREEN : BAR_ORANGE;
}

export function MetricBarChart({
  title,
  subtitle,
  bars,
  valuePrefix = "",
  valueSuffix = "",
  defaultBarColor,
  className,
}: MetricBarChartProps) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const maxBarHeight = 150;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E8E2D9] bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[#E5E4E1] px-6 pb-3 pt-4">
        <h3 className="font-display text-base font-bold text-[#1A1918]">
          {title}
        </h3>
        {subtitle && (
          <span className="text-[13px] text-muted-foreground">{subtitle}</span>
        )}
      </div>

      {bars.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No data available
        </p>
      ) : (
        <div className="flex items-end justify-around gap-2 px-6 pb-4 pt-6">
          {bars.map((bar) => {
            const height = Math.max((bar.value / maxValue) * maxBarHeight, 4);
            const barColor =
              bar.color ?? defaultBarColor ?? defaultColorForBar(bar.value, maxValue);

            return (
              <div
                key={bar.label}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[13px] font-semibold text-foreground">
                  {valuePrefix}{bar.value}{valueSuffix}
                </span>
                <div
                  className="w-full max-w-[60px] rounded-t-md"
                  style={{ height, backgroundColor: barColor }}
                />
                <span className="text-[12px] font-medium text-muted-foreground">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { MetricBarChartProps, BarData };
