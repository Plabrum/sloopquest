import { StatCard } from "@/components/data-display/stat-card";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { WidgetRead } from "../types";
import { useTimeSeriesData } from "../data-sources";

export function StatNumberWidget({ widget }: { widget: WidgetRead }) {
  const { data: response } = useTimeSeriesData(widget.query);

  const points = (response.data as NumericalTimeSeriesData)?.points ?? [];
  const lastPoint = points[points.length - 1];
  const raw = lastPoint?.value ?? response.total_records;
  const value = Math.round(raw).toLocaleString();

  return (
    <StatCard
      label={widget.title}
      value={value}
      color={widget.query.color ?? undefined}
      href={widget.query.href ?? undefined}
    />
  );
}
