'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import type { CategorySummary } from '@/db/queries/categories';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'created', label: 'Created' },
  { value: 'under_validation', label: 'Under Validation' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Priority' },
];

interface StaffReportFilterBarProps {
  categories: CategorySummary[];
}

export function StaffReportFilterBar({ categories }: StaffReportFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 whenever filters change
      params.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam('search', value);
    }, 300);
  }

  const hasFilters =
    searchParams.get('status') ||
    searchParams.get('category') ||
    searchParams.get('priority') ||
    searchParams.get('search') ||
    searchParams.get('sort');

  function clearFilters() {
    setSearchValue('');
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="surface-card grid grid-cols-1 items-end gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-12">
      {/* Search */}
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <label htmlFor="staff-report-search" className="field-label">
          Search reports
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="staff-report-search"
            type="search"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search reports…"
            aria-label="Search reports by title"
            className="input-field w-full pl-11"
          />
        </div>
      </div>

      {/* Status */}
      <div className="min-w-0 lg:col-span-2">
        <label htmlFor="staff-report-status" className="field-label">
          Status
        </label>
        <select
          id="staff-report-status"
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
          aria-label="Filter by status"
          className="input-field w-full"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div className="min-w-0 lg:col-span-2">
        <label htmlFor="staff-report-category" className="field-label">
          Category
        </label>
        <select
          id="staff-report-category"
          value={searchParams.get('category') ?? ''}
          onChange={(e) => updateParam('category', e.target.value)}
          aria-label="Filter by category"
          className="input-field w-full"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="min-w-0 lg:col-span-2">
        <label htmlFor="staff-report-priority" className="field-label">
          Priority
        </label>
        <select
          id="staff-report-priority"
          value={searchParams.get('priority') ?? ''}
          onChange={(e) => updateParam('priority', e.target.value)}
          aria-label="Filter by priority"
          className="input-field w-full"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div className="min-w-0 lg:col-span-2">
        <label htmlFor="staff-report-sort" className="field-label">
          Sort reports
        </label>
        <select
          id="staff-report-sort"
          value={searchParams.get('sort') ?? 'newest'}
          onChange={(e) => updateParam('sort', e.target.value)}
          aria-label="Sort reports"
          className="input-field w-full"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <div className="flex justify-end border-t border-border pt-3 sm:col-span-2 lg:col-span-12">
          <button type="button" onClick={clearFilters} className="btn-secondary">
            <X className="h-4.5 w-4.5" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
