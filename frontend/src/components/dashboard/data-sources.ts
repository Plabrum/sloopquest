import { useSuspenseQuery } from "@tanstack/react-query";
import { customInstance } from "@/openapi/custom-instance";
import type {
  ListRequest,
  TimeSeriesDataRequest,
  TimeSeriesDataResponse,
} from "@/openapi/litestarAPI.schemas";
import type { FilterDefinition, ResourceType, WidgetQuery } from "./types";

interface ResourceMeta {
  labelField: string;
  subField: string;
}

const RESOURCE_META: Record<ResourceType, ResourceMeta> = {
  invoices: { labelField: "identifier", subField: "state" },
  surveys:  { labelField: "id",             subField: "state" },
  vessels:  { labelField: "name",           subField: "hin" },
  reports:  { labelField: "title",          subField: "state" },
  clients:  { labelField: "display_name",   subField: "client_type" },
};

export function getResourceMeta(resource: ResourceType): ResourceMeta {
  return RESOURCE_META[resource];
}

export function useTimeSeriesData(query: WidgetQuery) {
  return useSuspenseQuery({
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
