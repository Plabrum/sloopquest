import { MetricAreaChart } from "@/components/data-display/metric-area-chart";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { WidgetRead } from "../types";
import { useTimeSeriesData } from "../data-sources";

function formatTimestamp(ts: string, granularity: string): string {
  const d = new Date(ts);
  if (granularity === "YEAR") return String(d.getUTCFullYear());
  if (granularity === "MONTH" || granularity === "QUARTER")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function AreaChartWidget({ widget }: { widget: WidgetRead }) {
  const { data: response } = useTimeSeriesData(widget.query);

  const numericalData = response.data as NumericalTimeSeriesData;
  const granularity = response.granularity_used ?? "DAY";
  const chartData = (numericalData.points ?? []).map((p) => ({
    label: formatTimestamp(p.timestamp, granularity),
    value: p.value ?? 0,
  }));

  return (
    <MetricAreaChart
      title={widget.title}
      data={chartData}
      series={[{ key: "value", label: widget.query.field ?? "" }]}
    />
  );
}
