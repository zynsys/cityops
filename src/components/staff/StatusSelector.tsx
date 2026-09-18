'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportStatus } from '@/generated/prisma/enums';
import { getStatusConfig } from '@/lib/reportStatusConfig';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useReportStatus } from './ReportStatusContext';

const ALLOWED_TRANSITIONS: Partial<Record<ReportStatus, ReportStatus[]>> = {
  created: ['under_validation', 'invalid'],
  under_validation: ['validated', 'invalid'],
  validated: ['assigned', 'invalid'],
  invalid: ['under_validation'],
  assigned: ['in_progress', 'validated'],
  in_progress: ['resolved', 'assigned'],
  resolved: ['closed', 'in_progress'],
  closed: ['resolved'],
};

interface StatusSelectorProps {
  reportId: number;
}

export function StaffReportStatusBadge() {
  const { status } = useReportStatus();
  return <StatusBadge status={status} />;
}

export function StatusSelector({ reportId }: StatusSelectorProps) {
  const router = useRouter();
  const { status, setStatus } = useReportStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedNext = ALLOWED_TRANSITIONS[status] ?? [];
  const currentCfg = getStatusConfig(status);

  if (allowedNext.length === 0) {
    return (
      <span title="No transitions available" aria-label={`Status: ${currentCfg.label}. No transitions available.`}>
        <StatusBadge status={status} />
      </span>
    );
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ReportStatus;
    if (newStatus === status) return;

    const previousStatus = status;
    setStatus(newStatus); // optimistic update
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(previousStatus); // revert
        setError((data as { error?: string }).error ?? 'Failed to update status');
        return;
      }

      router.refresh();
    } catch {
      setStatus(previousStatus); // revert
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
          value={status}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Update report status"
          className="input-field w-full min-w-0 cursor-pointer disabled:cursor-wait disabled:opacity-60 sm:w-[180px]"
        >
          <option value={status}>{currentCfg.label}</option>
          {allowedNext.map((s) => {
            const cfg = getStatusConfig(s);
            return (
              <option key={s} value={s}>
                {cfg.label}
              </option>
            );
          })}
        </select>
      </div>
      {error && (
        <p
          className="max-w-full rounded-lg bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger sm:max-w-[200px]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
