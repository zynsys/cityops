"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { CategoryOption } from "@/db/queries/reports";

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "created", label: "Created" },
  { value: "under_validation", label: "Under Validation" },
  { value: "validated", label: "Validated" },
  { value: "invalid", label: "Invalid" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS = [
  { value: "updated_desc", label: "Recently Updated" },
  { value: "created_desc", label: "Newest First" },
  { value: "created_asc", label: "Oldest First" },
  { value: "priority", label: "Highest Priority" },
];

interface ReportFiltersProps {
  categories: CategoryOption[];
  currentStatus: string;
  currentCategory: string;
  currentSort: string;
  basePath?: string;
}

export default function ReportFilters({
  categories,
  currentStatus,
  currentCategory,
  currentSort,
  basePath = "/reports",
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }

  const hasFilters = !!currentStatus || !!currentCategory;

  const selectClass =
    "h-9 rounded-lg border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent flex-1 min-w-0";

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={currentStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={currentCategory}
        onChange={(e) => updateParam("category", e.target.value)}
        className={selectClass}
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.slug} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={currentSort || "updated_desc"}
        onChange={(e) => updateParam("sort", e.target.value)}
        className={selectClass}
        aria-label="Sort reports"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("status");
            params.delete("category");
            params.set("page", "1");
            router.push(`${basePath}?${params.toString()}`);
          }}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );
}
