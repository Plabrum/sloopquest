import { MetricBarChart } from "@/components/data-display/metric-bar-chart";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { WidgetRead } from "../types";
import { useTimeSeriesData } from "../data-sources";

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function BarChartWidget({ widget }: { widget: WidgetRead }) {
  const { data: response } = useTimeSeriesData(widget.query);

  const numericalData = response.data as NumericalTimeSeriesData;
  const bars = (numericalData.points ?? []).map((p) => ({
    label: formatTimestamp(p.timestamp),
    value: p.value ?? 0,
  }));

  return <MetricBarChart title={widget.title} bars={bars} />;
}
