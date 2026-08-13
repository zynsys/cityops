"use client";

import { createContext, useContext, useState } from "react";
import type { ReportStatus } from "@/generated/prisma/enums";
import { getStatusConfig } from "@/lib/reportStatusConfig";

interface ReportStatusContextValue {
  status: ReportStatus;
  setStatus: (s: ReportStatus) => void;
}

const ReportStatusContext = createContext<ReportStatusContextValue | null>(null);

export function useReportStatus() {
  const ctx = useContext(ReportStatusContext);
  if (!ctx) throw new Error("useReportStatus must be used within ReportStatusProvider");
  return ctx;
}

export function ReportStatusProvider({
  initialStatus,
  children,
}: {
  initialStatus: ReportStatus;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ReportStatus>(initialStatus);
  return (
    <ReportStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </ReportStatusContext.Provider>
  );
}

export function ReportStatusBadge() {
  const { status } = useReportStatus();
  const cfg = getStatusConfig(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
