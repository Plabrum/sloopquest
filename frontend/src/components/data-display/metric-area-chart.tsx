import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  const chartConfig: ChartConfig = Object.fromEntries(
    series.map((s, i) => [
      s.key,
      {
        label: s.label,
        color: s.color ?? `var(--chart-${(i % 5) + 1})`,
      },
    ]),
  );

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

      {data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No data available
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full px-2 pt-4 pb-2"
        >
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient
                  key={s.key}
                  id={`gradient-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={s.color ?? `var(--chart-${(i % 5) + 1})`}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={s.color ?? `var(--chart-${(i % 5) + 1})`}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
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
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={(props) => <ChartTooltipContent {...props} />}
            />
            {series.length > 1 && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                fill={`url(#gradient-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

export type { MetricAreaChartProps, AreaSeriesConfig };
