"use client";

import { useReportsPageContext } from "./ReportsPageContext";
import ReportCard from "./ReportCard";
import type { MyReportSummary } from "@/db/queries/reports";

interface MyReportCardProps {
  report: MyReportSummary;
}

export default function MyReportCard({ report }: MyReportCardProps) {
  const { setHoveredId } = useReportsPageContext();

  return (
    <div className="border-b border-border last:border-b-0">
      <ReportCard
        report={{
          id: report.id,
          title: report.title,
          status: report.status,
          categoryName: report.categoryName,
          categorySlug: report.categorySlug,
          categoryColor: report.categoryColor,
          tenantName: report.tenantName,
          locationText: report.locationText,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          thumbnailUrl: report.thumbnailUrl,
        }}
        onMouseEnter={() => setHoveredId(report.id)}
        onMouseLeave={() => setHoveredId(null)}
      />
    </div>
  );
}
