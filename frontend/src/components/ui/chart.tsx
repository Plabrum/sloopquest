import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipPayload } from "recharts";
import type { LegendPayload } from "recharts/types/component/DefaultLegendContent";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string }
>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used inside <ChartContainer>");
  return ctx;
}

function ChartContainer({
  id,
  className,
  children,
  config,
}: React.ComponentProps<"div"> & { config: ChartConfig }) {
  const uid = React.useId();
  const chartId = id ?? `chart-${uid.replace(/:/g, "")}`;

  const colorVars = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        `--color-${key}`,
        value.color ?? `var(--chart-1)`,
      ]),
    );
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        id={chartId}
        className={cn("aspect-video w-full text-xs", className)}
        style={colorVars as React.CSSProperties}
      >
        <RechartsPrimitive.ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 1, height: 1 }}
        >
          {children as React.ReactElement}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  className,
}: {
  active?: boolean;
  payload?: TooltipPayload;
  label?: string | number;
  hideLabel?: boolean;
  className?: string;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2 shadow-md text-card-foreground text-xs",
        className,
      )}
    >
      {!hideLabel && label && (
        <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? "");
          const cfg = config[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: `var(--color-${key})` }}
              />
              <span className="text-muted-foreground">{cfg?.label ?? key}</span>
              <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendContent({
  payload,
  className,
}: {
  payload?: ReadonlyArray<LegendPayload>;
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-4 text-xs", className)}>
      {payload.map((item) => {
        const key = item.value ?? "";
        const cfg = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: `var(--color-${key})` }}
            />
            <span className="text-muted-foreground">{cfg?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
