"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReportListPaginationProps {
  currentPage: number;
  total: number;
  pageSize: number;
}

export default function ReportListPagination({
  currentPage,
  total,
  pageSize,
}: ReportListPaginationProps) {
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `/reports?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-2 py-3 border-t border-border shrink-0"
    >
      {currentPage > 1 ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground/40 cursor-not-allowed select-none">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </span>
      )}

      <span className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground/40 cursor-not-allowed select-none">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
