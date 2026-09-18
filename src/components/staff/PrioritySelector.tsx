'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportPriority } from '@/generated/prisma/enums';
import { useReportPriority } from './ReportPriorityContext';
import { PriorityBadge } from './PriorityBadge';

const PRIORITY_OPTIONS: { value: ReportPriority | null; label: string }[] = [
  { value: null, label: 'Not set' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface PrioritySelectorProps {
  reportId: number;
}

export function StaffReportPriorityBadge() {
  const { priority } = useReportPriority();
  return <PriorityBadge priority={priority} />;
}

export function PrioritySelector({ reportId }: PrioritySelectorProps) {
  const router = useRouter();
  const { priority, setPriority } = useReportPriority();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const newPriority = raw === '' ? null : (raw as ReportPriority);
    if (newPriority === priority) return;

    const previousPriority = priority;
    setPriority(newPriority); // optimistic update
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPriority(previousPriority); // revert
        setError((data as { error?: string }).error ?? 'Failed to update priority');
        return;
      }

      router.refresh();
    } catch {
      setPriority(previousPriority); // revert
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {isLoading && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent"
            aria-hidden="true"
          />
        )}
        <select
          value={priority ?? ''}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Update report priority"
          className="input-field w-full min-w-0 cursor-pointer disabled:cursor-wait disabled:opacity-60 sm:w-[180px]"
        >
          {PRIORITY_OPTIONS.map(({ value, label }) => (
            <option key={value ?? 'none'} value={value ?? ''}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p
          className="max-w-full rounded-lg bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger sm:max-w-[200px]"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
