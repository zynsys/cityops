"use client";

import { createContext, useContext, useState } from "react";

interface ReportsPageContextValue {
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
}

const ReportsPageContext = createContext<ReportsPageContextValue>({
  hoveredId: null,
  setHoveredId: () => {},
});

export function ReportsPageContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  return (
    <ReportsPageContext.Provider value={{ hoveredId, setHoveredId }}>
      {children}
    </ReportsPageContext.Provider>
  );
}

export function useReportsPageContext() {
  return useContext(ReportsPageContext);
}
