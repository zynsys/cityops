'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';

const DRAFT_KEY = 'cityops:wizard:draft';

export interface SimilarReportCandidate {
  id: number;
  title: string;
  status: string;
  categoryName: string;
  categoryColor: string;
  locationText: string | null;
  distanceMetres: number;
  createdAt: string;
  score: number;
}

interface DuplicateWarningProps {
  candidates: SimilarReportCandidate[];
  onDismiss: () => void;
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `~${Math.round(metres)} m away`;
  return `~${(metres / 1000).toFixed(1)} km away`;
}

function formatRelativeDate(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

export default function DuplicateWarning({ candidates, onDismiss }: DuplicateWarningProps) {
  const router = useRouter();

  function handleSupport(reportId: number) {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // sessionStorage may be unavailable in some environments
    }
    router.push(`/reports/${reportId}`);
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-5 sm:p-6"
      role="region"
      aria-label="Similar reports"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Similar reports found nearby</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Before submitting, check if any of these existing reports match what you&apos;re seeing. Supporting an
            existing report helps authorities prioritise it faster.
          </p>
        </div>
      </div>

      {/* Candidate list */}
      <ul className="flex flex-col gap-3" role="list">
        {candidates.map((report) => {
          const truncatedTitle = report.title.length > 80 ? report.title.slice(0, 80) + '…' : report.title;

          return (
            <li
              key={report.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs"
            >
              <div className="flex flex-col gap-2">
                <p className="text-sm leading-relaxed font-semibold wrap-break-word text-foreground">
                  {truncatedTitle}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* The candidate provides a name, so use the shared generic icon. */}
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CategoryIcon size={14} className="shrink-0" />
                    {report.categoryName}
                  </span>
                  {/* Status badge */}
                  <StatusBadge status={report.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDistance(report.distanceMetres)}</span>
                  <span>{formatRelativeDate(report.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/reports/${report.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3"
                >
                  View report
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button type="button" onClick={() => handleSupport(report.id)} className="btn-primary px-3">
                  Support this report
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-11 self-start rounded-lg px-2 text-left text-sm font-medium text-warning underline underline-offset-4 transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
      >
        These don&apos;t match — submit mine
      </button>
    </div>
  );
}
