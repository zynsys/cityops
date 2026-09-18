'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReportListPaginationProps {
  currentPage: number;
  total: number;
  pageSize: number;
}

export default function ReportListPagination({ currentPage, total, pageSize }: ReportListPaginationProps) {
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `/reports?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3"
    >
      {currentPage > 1 ? (
        <Link href={pageHref(currentPage - 1)} className="btn-secondary gap-1 px-3">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-11 cursor-not-allowed select-none items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </span>
      )}

      <span className="text-center text-sm tabular-nums text-muted-foreground">
        Page <span className="font-medium text-foreground">{currentPage}</span> of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link href={pageHref(currentPage + 1)} className="btn-secondary gap-1 px-3">
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-11 cursor-not-allowed select-none items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground opacity-50"
        >
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
