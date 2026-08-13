"use client";

import Link from "next/link";
import { MapPin, User, Clock } from "lucide-react";
import { getStatusConfig } from "@/lib/reportStatusConfig";
import ReportThumbnail from "./ReportThumbnail";

export interface ReportCardData {
  id: number;
  title: string;
  status: string;
  categoryName: string;
  categorySlug?: string | null;
  categoryColor: string | null;
  tenantName: string;
  locationText: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  thumbnailUrl?: string | null;
  reporterName?: string | null;
}

interface ReportCardProps {
  report: ReportCardData;
  canEdit?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ReportCard({
  report,
  onMouseEnter,
  onMouseLeave,
}: ReportCardProps) {
  const statusCfg = getStatusConfig(report.status);
  const createdAt =
    typeof report.createdAt === "string" ? new Date(report.createdAt) : report.createdAt;

  return (
    <Link
      href={`/reports/${report.id}`}
      className="flex items-start gap-3 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Thumbnail */}
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
        <ReportThumbnail
          src={report.thumbnailUrl ?? undefined}
          alt={report.title}
          categorySlug={report.categorySlug}
          categoryColor={report.categoryColor}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Title + status badge row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-w-0">
            {report.title}
          </span>
          <span
            className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white leading-none"
            style={{ backgroundColor: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Category badge */}
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
            style={{
              backgroundColor: (report.categoryColor ?? "#6B7280") + "28",
              color: report.categoryColor ?? "#6B7280",
            }}
          >
            {report.categoryName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{report.reporterName ?? "Anonymous"}</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{report.tenantName}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{formatDate(createdAt)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
