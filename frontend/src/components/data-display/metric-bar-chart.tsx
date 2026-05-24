import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  formatCompactNumber,
} from "@/lib/chart-config";
import { ChartLegend } from "@/components/data-display/chart-legend";
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
  const chartData = bars.map((b) => ({ label: b.label, value: b.value, color: b.color }));

  const chartConfig: ChartConfig = {
    value: {
      label: title,
      color: defaultBarColor ?? "var(--chart-1)",
    },
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card",
        className,
      )}
    >
      <div className="flex items-baseline justify-between px-5 pt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {subtitle && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>

      {bars.some((b) => b.color) && (
        <ChartLegend
          items={bars
            .filter((b) => b.color)
            .map((b) => ({ label: b.label, color: b.color! }))}
        />
      )}

      {bars.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No data available
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full px-2 pt-3 pb-2"
        >
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK}
              tickFormatter={(v) =>
                `${valuePrefix}${formatCompactNumber(Number(v))}${valueSuffix}`
              }
              width={44}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.25 }}
              content={(props) => <ChartTooltipContent {...props} hideLabel />}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color ?? "var(--color-value)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

export type { MetricBarChartProps, BarData };
