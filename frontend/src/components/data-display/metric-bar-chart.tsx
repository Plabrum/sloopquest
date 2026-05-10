import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

export function MetricBarChart({
  title,
  subtitle,
  bars,
  valuePrefix = "",
  valueSuffix = "",
  defaultBarColor,
  className,
}: MetricBarChartProps) {
  const chartData = bars.map((b) => ({ label: b.label, value: b.value }));

  const chartConfig: ChartConfig = {
    value: {
      label: title,
      color: defaultBarColor ?? "var(--chart-1)",
    },
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-6 pb-3 pt-4">
        <h3 className="font-display text-base font-bold text-foreground">
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
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full px-2 pt-4 pb-2">
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(v) => `${valuePrefix}${v}${valueSuffix}`}
              width={40}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={(props) => <ChartTooltipContent {...props} hideLabel />}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

export type { MetricBarChartProps, BarData };
