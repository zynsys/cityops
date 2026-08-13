"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { getStatusConfig } from "@/lib/reportStatusConfig";

const DRAFT_KEY = "cityops:wizard:draft";

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
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export default function DuplicateWarning({
  candidates,
  onDismiss,
}: DuplicateWarningProps) {
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
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Similar reports found nearby
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            Before submitting, check if any of these existing reports match what
            you&apos;re seeing. Supporting an existing report helps authorities
            prioritise it faster.
          </p>
        </div>
      </div>

      {/* Candidate list */}
      <ul className="flex flex-col gap-3" role="list">
        {candidates.map((report) => {
          const statusCfg = getStatusConfig(report.status);
          const truncatedTitle =
            report.title.length > 80
              ? report.title.slice(0, 80) + "…"
              : report.title;

          return (
            <li
              key={report.id}
              className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-surface p-3 flex flex-col gap-2"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {truncatedTitle}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category colour dot + name */}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: report.categoryColor }}
                      aria-hidden="true"
                    />
                    {report.categoryName}
                  </span>
                  {/* Status badge */}
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: statusCfg.color + "22",
                      color: statusCfg.color,
                    }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDistance(report.distanceMetres)}</span>
                  <span>{formatRelativeDate(report.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/reports/${report.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded transition-opacity"
                >
                  View report
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => handleSupport(report.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-accent text-accent-foreground rounded-md px-2.5 py-1 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
                >
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
        className="text-xs text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
      >
        These don&apos;t match — submit mine
      </button>
    </div>
  );
}
