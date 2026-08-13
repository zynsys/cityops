"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportPriority } from "@/generated/prisma/enums";
import { useReportPriority } from "./ReportPriorityContext";

const PRIORITY_OPTIONS: { value: ReportPriority | null; label: string }[] = [
  { value: null, label: "Not set" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface PrioritySelectorProps {
  reportId: number;
}

export function PrioritySelector({ reportId }: PrioritySelectorProps) {
  const router = useRouter();
  const { priority, setPriority } = useReportPriority();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const newPriority = raw === "" ? null : (raw as ReportPriority);
    if (newPriority === priority) return;

    const previousPriority = priority;
    setPriority(newPriority); // optimistic update
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPriority(previousPriority); // revert
        setError((data as { error?: string }).error ?? "Failed to update priority");
        return;
      }

      router.refresh();
    } catch {
      setPriority(previousPriority); // revert
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
          value={priority ?? ""}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Update report priority"
          className="w-[160px] rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground
                     focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 cursor-pointer"
        >
          {PRIORITY_OPTIONS.map(({ value, label }) => (
            <option
              key={value ?? "none"}
              value={value ?? ""}
            >
              {label}
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
