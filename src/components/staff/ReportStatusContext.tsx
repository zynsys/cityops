'use client';

import { createContext, useContext, useState } from 'react';
import type { ReportStatus } from '@/generated/prisma/enums';

interface ReportStatusContextValue {
  status: ReportStatus;
  setStatus: (s: ReportStatus) => void;
}

const ReportStatusContext = createContext<ReportStatusContextValue | null>(null);

export function useReportStatus() {
  const ctx = useContext(ReportStatusContext);
  if (!ctx) throw new Error('useReportStatus must be used within ReportStatusProvider');
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
  return <ReportStatusContext.Provider value={{ status, setStatus }}>{children}</ReportStatusContext.Provider>;
}
