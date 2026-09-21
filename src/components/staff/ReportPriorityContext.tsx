'use client';

import { createContext, useContext, useState } from 'react';
import type { ReportPriority } from '@/generated/prisma/enums';

interface ReportPriorityContextValue {
  priority: ReportPriority | null;
  setPriority: (p: ReportPriority | null) => void;
}

const ReportPriorityContext = createContext<ReportPriorityContextValue | null>(null);

export function useReportPriority() {
  const ctx = useContext(ReportPriorityContext);
  if (!ctx) throw new Error('useReportPriority must be used within ReportPriorityProvider');
  return ctx;
}

export function ReportPriorityProvider({
  initialPriority,
  children,
}: {
  initialPriority: ReportPriority | null;
  children: React.ReactNode;
}) {
  const [priority, setPriority] = useState<ReportPriority | null>(initialPriority);
  return <ReportPriorityContext.Provider value={{ priority, setPriority }}>{children}</ReportPriorityContext.Provider>;
}
