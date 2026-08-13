"use client";

import dynamic from "next/dynamic";
import type { PublicReport } from "@/db/queries/reports";

const ReportsMap = dynamic(
  () => import("@/components/reports/ReportsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-xs text-muted-foreground">Loading map…</p>
      </div>
    ),
  }
);

interface ReportsMapLoaderProps {
  reports: PublicReport[];
  councilSlug?: string;
  fitBounds?: boolean;
}

export default function ReportsMapLoader({ reports, councilSlug, fitBounds }: ReportsMapLoaderProps) {
  return <ReportsMap reports={reports} councilSlug={councilSlug} fitBounds={fitBounds} />;
}
