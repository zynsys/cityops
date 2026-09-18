import type { ReportDetail } from '@/db/queries/reports';
import { Calendar, User, Pencil, Building2 } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-info/10 text-info border-info/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-danger/10 text-danger border-danger/20',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

interface ReportHeaderProps {
  report: ReportDetail;
  editHref?: string;
}

export default function ReportHeader({ report, editHref }: ReportHeaderProps) {
  const createdAt = new Date(report.createdAt);
  const updatedAt = new Date(report.updatedAt);
  const hasBeenUpdated = updatedAt.getTime() - createdAt.getTime() > 60000;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <p className="eyebrow">Report #{report.id}</p>
          <h1 className="page-title mt-3 break-words">{report.title}</h1>
        </div>

        {/* Edit button — only shown to the reporter when report is still editable */}
        {editHref && (
          <Link href={editHref} className="btn-secondary shrink-0">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit report
          </Link>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status badge */}
        <StatusBadge status={report.status} />

        {/* Priority badge */}
        {report.priority && (
          <span
            className={`status-badge border ${PRIORITY_COLORS[report.priority] ?? 'border-border bg-muted text-muted-foreground'}`}
          >
            <span className="sr-only">Priority: </span>
            {PRIORITY_LABELS[report.priority] ?? report.priority}
          </span>
        )}

        {/* Category */}
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium leading-5 text-muted-foreground">
          <CategoryIcon slug={report.category.slug} size={15} className="shrink-0" />
          <span className="min-w-0 break-words">{report.category.name}</span>
        </span>

        {/* Council */}
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{report.tenant.name}</span>
        </span>

        {/* AI Validation badge */}
        {report.aiValidationResults[0] &&
          (() => {
            const outcome = report.aiValidationResults[0].outcome;
            const AI_BADGE: Record<string, { label: string; className: string }> = {
              valid: { label: 'AI Verified', className: 'border border-success/20 bg-success/10 text-success' },
              review_required: {
                label: 'Under Review',
                className: 'border border-warning/20 bg-warning/10 text-warning',
              },
              invalid: { label: 'Not Verified', className: 'border border-danger/20 bg-danger/10 text-danger' },
            };
            const badge = AI_BADGE[outcome];
            if (!badge) return null;
            return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
          })()}
      </div>

      {/* Reporter & dates */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
        <span className="flex min-w-0 items-start gap-2">
          <User className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-words">
            Reported by <span className="font-medium text-foreground">{report.reporter.displayName}</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
          {formatDate(createdAt)}
        </span>
        {hasBeenUpdated && <span className="text-sm">Updated {formatRelativeTime(updatedAt)}</span>}
      </div>
    </div>
  );
}
