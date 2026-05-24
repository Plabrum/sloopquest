export type {
  ResourceType,
  WidgetType,
  WidgetColor,
  WidgetQuery,
  WidgetRead,
  DashboardRead,
  Granularity,
  TimeRange,
  AggregationType,
} from "@/openapi/litestarAPI.schemas";

export type FilterDefinition =
  import("@/openapi/litestarAPI.schemas").WidgetQueryFiltersItem;
