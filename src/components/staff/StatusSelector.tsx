"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportStatus } from "@/generated/prisma/enums";
import { getStatusConfig } from "@/lib/reportStatusConfig";
import { useReportStatus } from "./ReportStatusContext";

const ALLOWED_TRANSITIONS: Partial<Record<ReportStatus, ReportStatus[]>> = {
  created: ["under_validation", "invalid"],
  under_validation: ["validated", "invalid"],
  validated: ["assigned", "invalid"],
  invalid: ["under_validation"],
  assigned: ["in_progress", "validated"],
  in_progress: ["resolved", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: ["resolved"],
};

interface StatusSelectorProps {
  reportId: number;
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
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${currentCfg.color}20`, color: currentCfg.color }}
        title="No transitions available"
        aria-label={`Status: ${currentCfg.label}. No transitions available.`}
      >
        {currentCfg.label}
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(previousStatus); // revert
        setError((data as { error?: string }).error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } catch {
      setStatus(previousStatus); // revert
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
          value={status}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Update report status"
          className="w-[160px] rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground
                     focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 cursor-pointer"
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
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
