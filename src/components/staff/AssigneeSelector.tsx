'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReportAssignee, type AssignedToUser } from './ReportAssigneeContext';

interface StaffUser {
  id: string;
  displayName: string;
}

interface AssigneeSelectorProps {
  reportId: number;
  staffUsers: StaffUser[];
  sessionUserDisplayName: string;
}

export function AssigneeSelector({ reportId, staffUsers, sessionUserDisplayName }: AssigneeSelectorProps) {
  const router = useRouter();
  const { assignedTo, setAssignedTo } = useReportAssignee();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAssignment(userId: string | null) {
    const previous = assignedTo;

    // Optimistic update
    if (userId) {
      const user = staffUsers.find((u) => u.id === userId) ?? {
        id: userId,
        displayName: sessionUserDisplayName,
      };
      setAssignedTo(user);
    } else {
      setAssignedTo(null);
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToUserId: userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssignedTo(previous); // revert
        setError((data as { error?: string }).error ?? 'Failed to update assignment');
        return;
      }

      const data = (await res.json()) as { assignedTo: AssignedToUser | null };
      setAssignedTo(data.assignedTo);
      router.refresh();
    } catch {
      setAssignedTo(previous); // revert
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    submitAssignment(val === '' ? null : val);
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
          value={assignedTo?.id ?? ''}
          onChange={handleSelectChange}
          disabled={isLoading}
          aria-label="Assign report to staff member"
          className="input-field w-full min-w-0 cursor-pointer disabled:cursor-wait disabled:opacity-60 sm:w-[180px]"
        >
          <option value="">Unassigned</option>
          {staffUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
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
