import { useSuspenseQuery } from "@tanstack/react-query";
import { customInstance } from "@/openapi/custom-instance";
import { clientColumnDefs } from "@/openapi/client/columns.gen";
import { invoiceColumnDefs } from "@/openapi/invoice/columns.gen";
import { reportColumnDefs } from "@/openapi/report/columns.gen";
import { surveyColumnDefs } from "@/openapi/survey/columns.gen";
import { vesselColumnDefs } from "@/openapi/vessel/columns.gen";
import type {
  ListRequest,
  TimeSeriesDataRequest,
  TimeSeriesDataResponse,
} from "@/openapi/litestarAPI.schemas";
import type { ColumnDefinition } from "@/lib/resource-table-types";
import type { FilterDefinition, ResourceType, WidgetQuery } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColumns = ColumnDefinition<any>[];

const RESOURCE_COLUMN_DEFS: Record<ResourceType, AnyColumns> = {
  invoices: invoiceColumnDefs,
  surveys: surveyColumnDefs,
  vessels: vesselColumnDefs,
  reports: reportColumnDefs,
  clients: clientColumnDefs,
};

export function getResourceColumns(resource: ResourceType): AnyColumns {
  return RESOURCE_COLUMN_DEFS[resource];
}

export function findColumn(
  resource: ResourceType,
  key: string,
): ColumnDefinition<Record<string, unknown>> | undefined {
  return getResourceColumns(resource).find((c) => c.key === key) as
    | ColumnDefinition<Record<string, unknown>>
    | undefined;
}

// The first column whose semantic type is "text" or "entity" — i.e. the
// column a human would read first. Falls back to the first column.
export function getPrimaryColumn(
  resource: ResourceType,
): ColumnDefinition<Record<string, unknown>> {
  const cols = getResourceColumns(resource);
  const primary = cols.find((c) => c.displayType === "text" || c.displayType === "entity");
  return (primary ?? cols[0]) as ColumnDefinition<Record<string, unknown>>;
}

// A status/enum column to show as the secondary chip on cards/list rows.
export function getSubColumn(
  resource: ResourceType,
): ColumnDefinition<Record<string, unknown>> | undefined {
  const cols = getResourceColumns(resource);
  return cols.find((c) => c.displayType === "status" || c.displayType === "enum") as
    | ColumnDefinition<Record<string, unknown>>
    | undefined;
}

export function useTimeSeriesData(query: WidgetQuery) {
  return useSuspenseQuery({
    staleTime: Infinity,
    queryKey: [
      "dashboard-data",
      query.resource,
      query.field,
      query.time_range,
      query.granularity,
      query.aggregation,
      query.filters,
    ],
    queryFn: ({ signal }) => {
      const body: TimeSeriesDataRequest = {
        field: query.field ?? "",
        ...(query.time_range && { time_range: query.time_range }),
        ...(query.granularity && { granularity: query.granularity }),
        filters: (query.filters as TimeSeriesDataRequest["filters"]) ?? [],
        ...(query.aggregation && { aggregation: query.aggregation }),
      };
      return customInstance<TimeSeriesDataResponse>({
        url: `/${query.resource}/data`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: body,
        signal,
      });
    },
  });
}

interface ResourceListResponse {
  items: Record<string, unknown>[];
  total: number;
}

export function useResourceList(
  resource: ResourceType,
  filters: FilterDefinition[] | undefined,
  limit: number,
) {
  return useSuspenseQuery({
    staleTime: Infinity,
    queryKey: ["dashboard-list", resource, filters, limit],
    queryFn: ({ signal }) => {
      const body: ListRequest = {
        filters: (filters as ListRequest["filters"]) ?? [],
        sorts: [{ column: "created_at", direction: "desc" }],
        limit,
        offset: 0,
      };
      return customInstance<ResourceListResponse>({
        url: `/${resource}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: body,
        signal,
      });
    },
  });
}
