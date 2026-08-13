"use client";

import { useReportsPageContext } from "./ReportsPageContext";
import ReportCard from "./ReportCard";
import type { PublicReport } from "@/db/queries/reports";

interface ReportListItemProps {
  report: PublicReport;
}

export default function ReportListItem({ report }: ReportListItemProps) {
  const { setHoveredId } = useReportsPageContext();

  return (
    <div className="border-b border-border last:border-b-0">
      <ReportCard
        report={{
          id: report.id,
          title: report.title,
          status: report.status,
          categoryName: report.category_name,
          categorySlug: report.category_slug,
          categoryColor: report.category_color,
          tenantName: report.tenant_name,
          locationText: report.locationText,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          thumbnailUrl: report.thumbnailUrl,
          reporterName: report.reporter_name,
        }}
        onMouseEnter={() => setHoveredId(report.id)}
        onMouseLeave={() => setHoveredId(null)}
      />
    </div>
  );
}
