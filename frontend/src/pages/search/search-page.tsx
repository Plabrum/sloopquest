import { useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { searchRoute } from "@/router/authenticated.routes";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { ResourceTableSearch } from "@/components/resource-table/resource-table-search";
import { useResourceTable } from "@/hooks/use-resource-table";
import type {
  ColumnDefinition,
  ListRequest,
  PagedResponse,
} from "@/lib/resource-table-types";
import { useSearchSearch } from "@/openapi/search/search";
import { useListVessel } from "@/openapi/vessel/vessel";
import { vesselColumnDefs } from "@/openapi/vessel/columns.gen";
import { useListSurvey } from "@/openapi/survey/survey";
import { surveyColumnDefs } from "@/openapi/survey/columns.gen";
import { useListSurveyTemplate } from "@/openapi/survey-templates/survey-templates";
import { surveyTemplateColumnDefs } from "@/openapi/survey-templates/columns.gen";
import { useListClient } from "@/openapi/client/client";
import { clientColumnDefs } from "@/openapi/client/columns.gen";
import { useListReport } from "@/openapi/report/report";
import { reportColumnDefs } from "@/openapi/report/columns.gen";
import { useListInvoice } from "@/openapi/invoice/invoice";
import { invoiceColumnDefs } from "@/openapi/invoice/columns.gen";
import { useListPart } from "@/openapi/part/part";
import { partColumnDefs } from "@/openapi/part/columns.gen";
import { useListManufacturer } from "@/openapi/manufacturer/manufacturer";
import { manufacturerColumnDefs } from "@/openapi/manufacturer/columns.gen";
import { useListUser } from "@/openapi/user/user";
import { userColumnDefs } from "@/openapi/user/columns.gen";

const TABS = [
  "global",
  "vessel",
  "survey",
  "survey_template",
  "client",
  "report",
  "invoice",
  "part",
  "manufacturer",
  "user",
] as const;
type TabKey = (typeof TABS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  global: "All",
  vessel: "Vessels",
  survey: "Surveys",
  survey_template: "Templates",
  client: "Clients",
  report: "Reports",
  invoice: "Invoices",
  part: "Parts",
  manufacturer: "Manufacturers",
  user: "Users",
};

const ENTITY_ICONS: Record<string, string> = {
  vessel: "⛵",
  survey: "📋",
  survey_template: "📋",
  client: "👤",
  report: "📄",
  invoice: "🧾",
  part: "🔧",
  manufacturer: "🏭",
  user: "👥",
  address: "📍",
};

type ListHook<T> = (
  params: ListRequest,
  options?: { query?: { placeholderData?: typeof keepPreviousData } },
) => { data: PagedResponse<T> | undefined; isFetching: boolean };

function ListPanel<T extends { id: string | number }>({
  listQuery,
  columns,
  paramPrefix,
  onRowClick,
}: {
  listQuery: ListHook<T>;
  columns: ColumnDefinition<T>[];
  paramPrefix: string;
  onRowClick?: (row: T) => void;
}) {
  const { tableProps } = useResourceTable({ listQuery, columns, paramPrefix });
  return (
    <ResourceTable {...tableProps} columns={columns} onRowClick={onRowClick} />
  );
}

function GlobalSearchPanel() {
  const { q: urlQ } = searchRoute.useSearch();
  const navigate = useNavigate({ from: "/search" });

  const handleChange = useCallback(
    (val: string) => {
      navigate({ search: (prev) => ({ ...prev, q: val }), replace: true });
    },
    [navigate],
  );

  const term = urlQ.trim();
  const enabled = term.length >= 2;

  const { data, isLoading } = useSearchSearch(
    { q: term, limit: 50 },
    { query: { enabled } },
  );

  const results = data?.results ?? [];

  return (
    <div className="space-y-4">
      <ResourceTableSearch
        value={urlQ}
        onChange={handleChange}
        placeholder="Search across everything..."
      />

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      )}
      {enabled && isLoading && (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}
      {enabled && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No results found.</p>
      )}
      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-md border">
          {results.map((r) => (
            <li key={`${r.entity_type}:${r.id}`}>
              <Link
                to={r.path}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="text-base">
                  {ENTITY_ICONS[r.entity_type] ?? "•"}
                </span>
                <span className="flex-1 truncate font-medium">{r.label}</span>
                {r.sublabel && (
                  <span className="truncate text-xs text-muted-foreground">
                    {r.sublabel}
                  </span>
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {r.entity_type.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchPage() {
  const { tab: urlTab } = searchRoute.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const detailNavigate = useNavigate();

  const activeTab: TabKey = (TABS as readonly string[]).includes(urlTab)
    ? (urlTab as TabKey)
    : "global";

  return (
    <PageTopBar title="Search">
      <div className="p-6 space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            navigate({ search: (prev) => ({ ...prev, tab: val }), replace: true })
          }
        >
          <TabsList variant="line" className="flex-wrap h-auto">
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {TAB_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="global">
            <GlobalSearchPanel />
          </TabsContent>
          <TabsContent value="vessel">
            <ListPanel
              listQuery={useListVessel}
              columns={vesselColumnDefs}
              paramPrefix="vessel"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/vessels/$vesselId",
                  params: { vesselId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="survey">
            <ListPanel
              listQuery={useListSurvey}
              columns={surveyColumnDefs}
              paramPrefix="survey"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/surveys/$surveyId",
                  params: { surveyId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="survey_template">
            <ListPanel
              listQuery={useListSurveyTemplate}
              columns={surveyTemplateColumnDefs}
              paramPrefix="tmpl"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/settings/templates/$templateId",
                  params: { templateId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="client">
            <ListPanel
              listQuery={useListClient}
              columns={clientColumnDefs}
              paramPrefix="client"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/clients/$clientId",
                  params: { clientId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="report">
            <ListPanel
              listQuery={useListReport}
              columns={reportColumnDefs}
              paramPrefix="report"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/reports/$reportId",
                  params: { reportId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="invoice">
            <ListPanel
              listQuery={useListInvoice}
              columns={invoiceColumnDefs}
              paramPrefix="invoice"
              onRowClick={(row) =>
                detailNavigate({
                  to: "/invoices/$invoiceId",
                  params: { invoiceId: String(row.id) },
                })
              }
            />
          </TabsContent>
          <TabsContent value="part">
            <ListPanel
              listQuery={useListPart}
              columns={partColumnDefs}
              paramPrefix="part"
            />
          </TabsContent>
          <TabsContent value="manufacturer">
            <ListPanel
              listQuery={useListManufacturer}
              columns={manufacturerColumnDefs}
              paramPrefix="manuf"
            />
          </TabsContent>
          <TabsContent value="user">
            <ListPanel
              listQuery={useListUser}
              columns={userColumnDefs}
              paramPrefix="user"
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageTopBar>
  );
}
