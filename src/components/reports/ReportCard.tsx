'use client';

import Link from 'next/link';
import { MapPin, User, Clock, ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CategoryIcon, getCategoryTone } from '@/components/ui/CategoryIcon';
import ReportThumbnail from './ReportThumbnail';

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
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ReportCard({ report, onMouseEnter, onMouseLeave }: ReportCardProps) {
  const createdAt = typeof report.createdAt === 'string' ? new Date(report.createdAt) : report.createdAt;

  return (
    <Link
      href={`/reports/${report.id}`}
      className="group flex min-w-0 items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:p-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Thumbnail */}
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-20 sm:w-20">
        <ReportThumbnail
          src={report.thumbnailUrl ?? undefined}
          alt={report.title}
          categorySlug={report.categorySlug}
          categoryColor={report.categoryColor}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground sm:text-base">
            {report.title}
          </span>
          <ArrowUpRight
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={report.status} />
          <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium leading-5 ${getCategoryTone(report.categorySlug)}`}
          >
            <CategoryIcon slug={report.categorySlug} size={14} className="shrink-0" />
            <span className="min-w-0 break-words">{report.categoryName}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-5 text-muted-foreground">
          <span className="flex min-w-0 items-start gap-1.5">
            <User className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{report.reporterName ?? 'Anonymous'}</span>
          </span>
          <span className="flex min-w-0 items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{report.tenantName}</span>
          </span>
          <span className="flex items-start gap-1.5">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{formatDate(createdAt)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
