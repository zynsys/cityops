import {
  CirclePlus,
  ArrowRightLeft,
  UserPlus,
  MessageSquare,
  Paperclip,
  ArrowUpDown,
  Link2,
  GitMerge,
  ShieldCheck,
  Eye,
  UserCheck,
} from "lucide-react";
import { getStatusConfig } from "@/lib/reportStatusConfig";
import type { ReportDetail } from "@/db/queries/reports";

type Activity = ReportDetail["activities"][number];

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: CirclePlus,
  status_changed: ArrowRightLeft,
  assigned: UserPlus,
  reassigned: UserCheck,
  commented: MessageSquare,
  attachment_added: Paperclip,
  priority_changed: ArrowUpDown,
  duplicate_linked: Link2,
  merged: GitMerge,
  validation_completed: ShieldCheck,
  manually_reviewed: Eye,
};

const ACTION_LABELS: Record<string, string> = {
  created: "Report created",
  status_changed: "Status changed",
  assigned: "Report assigned",
  reassigned: "Report reassigned",
  commented: "Comment added",
  attachment_added: "Attachment added",
  priority_changed: "Priority changed",
  duplicate_linked: "Linked as duplicate",
  merged: "Report merged",
  validation_completed: "Validation completed",
  manually_reviewed: "Manually reviewed",
};

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

interface ReportTimelineProps {
  activities: Activity[];
}

export default function ReportTimeline({ activities }: ReportTimelineProps) {
  if (activities.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Activity Timeline</h2>

      <div className="mt-4 space-y-0">
        {activities.map((activity, i) => {
          const Icon = ACTION_ICONS[activity.action] ?? CirclePlus;
          const isLast = i === activities.length - 1;

          return (
            <div key={activity.id} className="group relative flex gap-4">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="pb-6">
                <p className="text-sm font-medium text-foreground">
                  {getActionDescription(activity)}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{activity.user?.displayName ?? "System"}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(new Date(activity.createdAt))}</span>
                </div>

                {/* Current status badge */}
                {activity.action === "status_changed" && activity.newValue && (
                  <div className="mt-1.5">
                    <StatusBadge status={activity.newValue} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getActionDescription(activity: Activity): string {
  const base = ACTION_LABELS[activity.action] ?? activity.action;

  if (activity.action === "status_changed" && activity.oldValue && activity.newValue) {
    const oldCfg = getStatusConfig(activity.oldValue);
    const newCfg = getStatusConfig(activity.newValue);
    return `Status changed from ${oldCfg.label} to ${newCfg.label}`;
  }

  if (activity.action === "priority_changed" && activity.oldValue && activity.newValue) {
    return `Priority changed from ${activity.oldValue} to ${activity.newValue}`;
  }

  return base;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
