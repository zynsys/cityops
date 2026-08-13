"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReportAssignee, type AssignedToUser } from "./ReportAssigneeContext";

interface StaffUser {
  id: string;
  displayName: string;
}

interface AssigneeSelectorProps {
  reportId: number;
  staffUsers: StaffUser[];
  sessionUserDisplayName: string;
}

export function AssigneeSelector({
  reportId,
  staffUsers,
  sessionUserDisplayName,
}: AssigneeSelectorProps) {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToUserId: userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssignedTo(previous); // revert
        setError((data as { error?: string }).error ?? "Failed to update assignment");
        return;
      }

      const data = (await res.json()) as { assignedTo: AssignedToUser | null };
      setAssignedTo(data.assignedTo);
      router.refresh();
    } catch {
      setAssignedTo(previous); // revert
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    submitAssignment(val === "" ? null : val);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {isLoading && (
          <span
            className="h-3 w-3 animate-spin rounded-full border border-border border-t-accent"
            aria-hidden="true"
          />
        )}
        <select
          value={assignedTo?.id ?? ""}
          onChange={handleSelectChange}
          disabled={isLoading}
          aria-label="Assign report to staff member"
          className="w-[160px] rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground
                     focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 cursor-pointer"
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
        <p className="text-xs text-red-400" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
