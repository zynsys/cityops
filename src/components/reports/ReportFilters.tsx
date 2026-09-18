'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { CategoryOption } from '@/db/queries/reports';

const STATUSES = [
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

const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'created_desc', label: 'Newest First' },
  { value: 'created_asc', label: 'Oldest First' },
  { value: 'priority', label: 'Highest Priority' },
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
  basePath = '/reports',
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
    params.set('page', '1');
    router.push(`${basePath}?${params.toString()}`);
  }

  const hasFilters = !!currentStatus || !!currentCategory;

  const selectClass = 'input-field min-w-0 pr-8';

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="min-w-0">
        <span className="field-label">Status</span>
        <select
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0">
        <span className="field-label">Category</span>
        <select
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
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
      </label>

      <div className="col-span-2 flex items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="field-label">Sort reports</span>
          <select
            value={currentSort || 'updated_desc'}
            onChange={(e) => updateParam('sort', e.target.value)}
            className={selectClass}
            aria-label="Sort reports"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('status');
              params.delete('category');
              params.set('page', '1');
              router.push(`${basePath}?${params.toString()}`);
            }}
            className="btn-secondary shrink-0 px-3"
            aria-label="Clear status and category filters"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
