import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  resourceName?: string;
}

export function ResourceTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  resourceName = "results",
}: ResourceTablePaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? `No ${resourceName}`
          : `Showing ${startItem}–${endItem} of ${total} ${resourceName}`}
      </p>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-muted-foreground hover:bg-table-row-hover hover:text-foreground lg:flex"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <span className="sr-only">First page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-table-row-hover hover:text-foreground"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <span className="sr-only">Previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 text-sm tabular-nums text-muted-foreground/50">
          {page} / {totalPages || 1}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-table-row-hover hover:text-foreground"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <span className="sr-only">Next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-muted-foreground hover:bg-table-row-hover hover:text-foreground lg:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <span className="sr-only">Last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
