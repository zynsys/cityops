"use client";

import { createContext, useContext, useState } from "react";

export interface AssignedToUser {
  id: string;
  displayName: string;
}

interface ReportAssigneeContextValue {
  assignedTo: AssignedToUser | null;
  setAssignedTo: (user: AssignedToUser | null) => void;
}

const ReportAssigneeContext = createContext<ReportAssigneeContextValue | null>(null);

export function useReportAssignee() {
  const ctx = useContext(ReportAssigneeContext);
  if (!ctx) throw new Error("useReportAssignee must be used within ReportAssigneeProvider");
  return ctx;
}

export function ReportAssigneeProvider({
  initialAssignedTo,
  children,
}: {
  initialAssignedTo: AssignedToUser | null;
  children: React.ReactNode;
}) {
  const [assignedTo, setAssignedTo] = useState<AssignedToUser | null>(initialAssignedTo);
  return (
    <ReportAssigneeContext.Provider value={{ assignedTo, setAssignedTo }}>
      {children}
    </ReportAssigneeContext.Provider>
  );
}
