import {
  Area,
  AreaChart,
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
import { ChartLegend } from "@/components/data-display/chart-legend";
import {
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CURSOR,
  formatCompactNumber,
} from "@/lib/chart-config";
import { cn } from "@/lib/utils";

interface AreaSeriesConfig {
  key: string;
  label: string;
  color?: string;
}

interface MetricAreaChartProps {
  title: string;
  subtitle?: string;
  data: Array<{ label: string } & Record<string, number | string>>;
  series: AreaSeriesConfig[];
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export function MetricAreaChart({
  title,
  subtitle,
  data,
  series,
  valuePrefix = "",
  valueSuffix = "",
  className,
}: MetricAreaChartProps) {
  const seriesWithColor = series.map((s, i) => ({
    ...s,
    color: s.color ?? `var(--chart-${(i % 5) + 1})`,
  }));

  const chartConfig: ChartConfig = Object.fromEntries(
    seriesWithColor.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

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

      {seriesWithColor.length > 1 && (
        <ChartLegend
          items={seriesWithColor.map((s) => ({ label: s.label, color: s.color }))}
        />
      )}

      {data.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No data available
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full px-2 pt-3 pb-2"
        >
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
              cursor={CHART_TOOLTIP_CURSOR}
              content={(props) => <ChartTooltipContent {...props} />}
            />
            {seriesWithColor.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                strokeWidth={1.75}
                fill={`var(--color-${s.key})`}
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

export type { MetricAreaChartProps, AreaSeriesConfig };
