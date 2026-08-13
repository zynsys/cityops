import { getStatusConfig } from "@/lib/reportStatusConfig";
import type { ReportDetail } from "@/db/queries/reports";
import { Calendar, User, Pencil } from "lucide-react";
import Link from "next/link";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
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
  const statusCfg = getStatusConfig(report.status);
  const createdAt = new Date(report.createdAt);
  const updatedAt = new Date(report.updatedAt);
  const hasBeenUpdated = updatedAt.getTime() - createdAt.getTime() > 60000;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        {report.title}
      </h1>

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Status badge */}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: statusCfg.color }}
        >
          {statusCfg.label}
        </span>

        {/* Priority badge */}
        {report.priority && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[report.priority] ?? ""}`}
          >
            {PRIORITY_LABELS[report.priority] ?? report.priority}
          </span>
        )}

        {/* Category */}
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: report.category.color ?? "#6B7280" }}
          />
          {report.category.name}
        </span>

        {/* Council */}
        <span className="text-xs text-gray-300">
          {report.tenant.name}
        </span>

        {/* AI Validation badge */}
        {report.aiValidationResults[0] && (() => {
          const outcome = report.aiValidationResults[0].outcome;
          const AI_BADGE: Record<string, { label: string; className: string }> = {
            valid: { label: "AI Verified", className: "bg-green-500/15 text-green-400 border border-green-500/30" },
            review_required: { label: "Under Review", className: "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30" },
            invalid: { label: "Not Verified", className: "bg-red-500/15 text-red-400 border border-red-500/30" },
          };
          const badge = AI_BADGE[outcome];
          if (!badge) return null;
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          );
        })()}
      </div>

      {/* Reporter & dates */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Reported by {report.reporter.displayName}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(createdAt)}
        </span>
        {hasBeenUpdated && (
          <span className="text-xs">
            Updated {formatRelativeTime(updatedAt)}
          </span>
        )}
      </div>

      {/* Edit button — only shown to the reporter when report is still editable */}
      {editHref && (
        <div className="mt-4">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit report
          </Link>
        </div>
      )}
    </div>
  );
}
