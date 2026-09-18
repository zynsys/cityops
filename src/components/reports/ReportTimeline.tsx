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
} from 'lucide-react';
import { getStatusConfig } from '@/lib/reportStatusConfig';
import type { ReportDetail } from '@/db/queries/reports';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Activity = ReportDetail['activities'][number];

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
  created: 'Report created',
  status_changed: 'Status changed',
  assigned: 'Report assigned',
  reassigned: 'Report reassigned',
  commented: 'Comment added',
  attachment_added: 'Attachment added',
  priority_changed: 'Priority changed',
  duplicate_linked: 'Linked as duplicate',
  merged: 'Report merged',
  validation_completed: 'Validation completed',
  manually_reviewed: 'Manually reviewed',
};

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

interface ReportTimelineProps {
  activities: Activity[];
}

export default function ReportTimeline({ activities }: ReportTimelineProps) {
  if (activities.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Activity Timeline</h2>

      <div className="mt-5 space-y-0">
        {activities.map((activity, i) => {
          const Icon = ACTION_ICONS[activity.action] ?? CirclePlus;
          const isLast = i === activities.length - 1;

          return (
            <div key={activity.id} className="group relative flex gap-4">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1 pb-6">
                <p className="break-words text-sm font-medium leading-6 text-foreground">
                  {getActionDescription(activity)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                  <span className="break-words">{activity.user?.displayName ?? 'System'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeTime(new Date(activity.createdAt))}</span>
                </div>

                {/* Current status badge */}
                {activity.action === 'status_changed' && activity.newValue && (
                  <div className="mt-2">
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

  if (activity.action === 'status_changed' && activity.oldValue && activity.newValue) {
    const oldCfg = getStatusConfig(activity.oldValue);
    const newCfg = getStatusConfig(activity.newValue);
    return `Status changed from ${oldCfg.label} to ${newCfg.label}`;
  }

  if (activity.action === 'priority_changed' && activity.oldValue && activity.newValue) {
    return `Priority changed from ${activity.oldValue} to ${activity.newValue}`;
  }

  return base;
}
