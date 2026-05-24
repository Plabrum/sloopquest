import { Fragment, useMemo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ColumnDefinition,
  ResourceTableProps,
  SortState,
} from "@/lib/resource-table-types";
import { ResourceTableFilters } from "./resource-table-filters";
import { ResourceTablePagination } from "./resource-table-pagination";
import { ResourceTableSearch } from "./resource-table-search";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    hideOnMobile?: boolean;
  }
}

function SortableHeader<T>({
  column,
  sorts,
  onSortsChange,
}: {
  column: ColumnDefinition<T>;
  sorts?: SortState;
  onSortsChange?: (sorts: SortState) => void;
}) {
  const currentSort = sorts?.sorts.find((s) => s.column === column.key);
  const direction = currentSort?.direction;

  const toggleSort = () => {
    if (!onSortsChange) return;

    // Cycle: none → asc → desc → none
    if (!direction) {
      onSortsChange({ sorts: [{ column: column.key, direction: "asc" }] });
    } else if (direction === "asc") {
      onSortsChange({ sorts: [{ column: column.key, direction: "desc" }] });
    } else {
      onSortsChange({ sorts: [] });
    }
  };

  if (!column.sortable) {
    return <span className="font-medium text-sidebar-accent-foreground">{column.header}</span>;
  }

  return (
    <button
      type="button"
      onClick={toggleSort}
      className="inline-flex items-center gap-1 font-medium text-sidebar-accent-foreground hover:text-sidebar-accent-foreground/80"
    >
      {column.header}
      {!direction && <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      {direction === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
      {direction === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
    </button>
  );
}

export function ResourceTable<T extends { id: string | number }>({
  data,
  columns,
  filters,
  onFiltersChange,
  sorts,
  onSortsChange,
  searchQuery,
  onSearchChange,
  page,
  onPageChange,
  pageSize = 25,
  showPagination = true,
  topLevelActions,
  onRowClick,
  highlightId,
  expandedId,
  renderRowExpansion,
  resourceName,
  emptyState,
  loading,
  classNames,
}: ResourceTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const tanStackColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        header: () => (
          <SortableHeader column={col} sorts={sorts} onSortsChange={onSortsChange} />
        ),
        cell: ({ row }) => col.render(row.original),
        enableSorting: col.sortable ?? false,
        meta: { className: col.className, hideOnMobile: col.hideOnMobile },
      })),
    [columns, sorts, onSortsChange],
  );

  const table = useReactTable({
    data: data.items,
    columns: tanStackColumns,
    pageCount: Math.ceil(data.total / pageSize),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full space-y-4">
      {(onSearchChange || topLevelActions || (filters && onFiltersChange)) && (
        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="flex-1">
              <ResourceTableSearch
                value={searchQuery ?? ""}
                onChange={onSearchChange}
              />
            </div>
          )}
          {filters && onFiltersChange && (
            <ResourceTableFilters
              columns={columns}
              filters={filters.filters}
              onAdd={(f) =>
                onFiltersChange({ filters: [...filters.filters, f] })
              }
              onRemove={(col) =>
                onFiltersChange({
                  filters: filters.filters.filter((f) => f.column !== col),
                })
              }
            />
          )}
          {topLevelActions}
        </div>
      )}

      <div
        className={cn(
          // overflow-x-auto so wide tables scroll horizontally on narrower
          // viewports instead of getting silently clipped — without disturbing
          // the rounded card framing.
          "overflow-x-auto rounded-xl border border-border/30 bg-card p-0.5",
          loading && "opacity-60",
        )}
      >
        <Table>
          <TableHeader className={cn("", classNames?.header)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-0 hover:bg-transparent [&>th]:bg-sidebar-accent [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-sidebar-accent-foreground",
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.hideOnMobile && "hidden md:table-cell",
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  {emptyState ?? (
                    <span className="text-muted-foreground">No results.</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const item = row.original;
                const isExpanded =
                  expandedId != null && String(item.id) === String(expandedId);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      className={cn(
                        "border-0 transition-colors even:bg-primary/[0.05]",
                        classNames?.row,
                        onRowClick && "cursor-pointer hover:bg-primary/[0.1]",
                        highlightId != null &&
                          String(item.id) === String(highlightId) &&
                          "bg-primary/15 ring-1 ring-primary/30 ring-inset rounded-lg",
                        isExpanded && "bg-primary/[0.08]",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.columnDef.meta?.className,
                            cell.column.columnDef.meta?.hideOnMobile && "hidden md:table-cell",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderRowExpansion && (
                      <TableRow className="border-0 bg-primary/[0.04] hover:bg-primary/[0.04]">
                        <TableCell colSpan={columns.length} className="p-0">
                          {renderRowExpansion(item)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <ResourceTablePagination
          page={page}
          totalPages={totalPages}
          total={data.total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          resourceName={resourceName}
        />
      )}
    </div>
  );
}
