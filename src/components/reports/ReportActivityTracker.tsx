import { Check, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Fixed lifecycle stages a report progresses through.
 * Order matters — earlier index = earlier in the pipeline.
 */
const STAGES = [
  { key: 'created', label: 'Created', actions: ['created'] },
  { key: 'under_validation', label: 'Under Review', actions: ['status_changed'] },
  { key: 'assigned', label: 'Assigned', actions: ['assigned', 'status_changed'] },
  { key: 'in_progress', label: 'In Progress', actions: ['status_changed'] },
  { key: 'resolved', label: 'Resolved', actions: ['status_changed'] },
  { key: 'closed', label: 'Closed', actions: ['status_changed'] },
] as const;

/** Alternate path for rejected reports: Created → Under Review → Invalid */
const INVALID_STAGES = [
  { key: 'created', label: 'Created', actions: ['created'] },
  { key: 'under_validation', label: 'Under Review', actions: ['status_changed'] },
  { key: 'invalid', label: 'Invalid', actions: ['status_changed'] },
] as const;

type Stage = { key: string; label: string };

interface ActivityItem {
  action: string;
  createdAt: Date | string;
  newValue: string | null;
  user?: { displayName: string } | null;
}

interface StageInfo {
  date: Date | null;
  actor: string | null;
}

function getStageInfo(stageKey: string, activities: ActivityItem[]): StageInfo {
  if (stageKey === 'created') {
    const created = activities.find((a) => a.action === 'created');
    return {
      date: created ? new Date(created.createdAt) : null,
      actor: created?.user?.displayName ?? null,
    };
  }

  if (stageKey === 'assigned') {
    const assigned = activities.find((a) => a.action === 'assigned');
    if (assigned) {
      return {
        date: new Date(assigned.createdAt),
        actor: assigned.user?.displayName ?? null,
      };
    }
  }

  // For status_changed stages, find the activity where newValue matches the stage key
  const match = activities.find(
    (a) =>
      a.action === 'status_changed' &&
      (a.newValue === stageKey || (stageKey === 'under_validation' && a.newValue === 'validated')),
  );
  return {
    date: match ? new Date(match.createdAt) : null,
    actor: match?.user?.displayName ?? null,
  };
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

interface ReportActivityTrackerProps {
  status: string;
  activities: ActivityItem[];
}

/** Renders a single stage node circle */
function StageNode({
  stage,
  index,
  isCompleted,
  isCurrent,
  isInvalidTerminal,
  size = 'lg',
}: {
  stage: Stage;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isInvalidTerminal: boolean;
  size?: 'lg' | 'sm';
}) {
  const ringClass = isCurrent
    ? `ring-2 ring-offset-4 ring-offset-surface ${isInvalidTerminal ? 'ring-danger/25' : 'ring-accent/25'}`
    : '';
  const sizeClass = size === 'lg' ? 'h-9 w-9 text-xs' : 'h-8 w-8 text-xs';

  const toneClass = isCompleted
    ? isInvalidTerminal
      ? 'border-danger/20 bg-danger/10 text-danger'
      : isCurrent
        ? 'border-accent bg-accent text-accent-foreground'
        : 'border-accent/20 bg-accent/10 text-accent'
    : 'border-border bg-background text-muted-foreground';

  const baseClass = `relative z-10 flex ${sizeClass} shrink-0 items-center justify-center rounded-full border font-semibold transition-colors ${toneClass} ${ringClass}`;

  return (
    <div className={baseClass} title={stage.label} aria-current={isCurrent ? 'step' : undefined}>
      {isCompleted ? (
        isInvalidTerminal ? (
          <X className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
        ) : (
          <Check className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
        )
      ) : (
        <span>{index + 1}</span>
      )}
    </div>
  );
}

export default function ReportActivityTracker({ status, activities }: ReportActivityTrackerProps) {
  const isInvalid = status === 'invalid';
  const stages: readonly Stage[] = isInvalid ? INVALID_STAGES : STAGES;

  const activeIndex = isInvalid
    ? INVALID_STAGES.length - 1 // all 3 stages lit: Created, Under Review, Invalid
    : STAGES.findIndex((s) => s.key === status || (s.key === 'under_validation' && status === 'validated'));

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Report Progress</h2>
        <StatusBadge status={status} />
      </div>

      {/* Desktop: horizontal bar */}
      <div className="mt-7 hidden sm:block">
        <div className="relative flex items-start">
          {/* Continuous connector line */}
          <div className="pointer-events-none absolute top-4.5 h-px" style={{ left: '18px', right: '18px' }}>
            <div className="absolute inset-0 rounded-full bg-border" />
            {activeIndex > 0 && (
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                  isInvalid ? 'bg-danger/50' : 'bg-accent/40'
                }`}
                style={{
                  width: `${(activeIndex / (stages.length - 1)) * 100}%`,
                }}
              />
            )}
          </div>

          {stages.map((stage, i) => {
            const isCompleted = i <= activeIndex;
            const isCurrent = i === activeIndex;
            const isInvalidTerminal = isInvalid && i === stages.length - 1;
            const info = isCompleted ? getStageInfo(stage.key, activities) : null;

            return (
              <div
                key={stage.key}
                className={`flex min-w-0 flex-1 flex-col ${
                  i === 0 ? 'items-start' : i === stages.length - 1 ? 'items-end' : 'items-center'
                }`}
              >
                <StageNode
                  stage={stage}
                  index={i}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isInvalidTerminal={isInvalidTerminal}
                  size="lg"
                />
                <span
                  className={`mt-3 max-w-full text-xs font-medium leading-5 ${
                    isInvalidTerminal ? 'text-danger' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </span>
                {info?.date && (
                  <span className="mt-1 max-w-full break-words text-xs leading-5 text-muted-foreground">
                    {formatShortDate(info.date)} · {info.actor ?? 'System'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical stepper */}
      <div className="mt-6 sm:hidden">
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const isCompleted = i <= activeIndex;
            const isCurrent = i === activeIndex;
            const isInvalidTerminal = isInvalid && i === stages.length - 1;
            const info = isCompleted ? getStageInfo(stage.key, activities) : null;
            const connectorColor =
              isInvalid && i === stages.length - 2 ? 'bg-danger/50' : i < activeIndex ? 'bg-accent/40' : 'bg-border';

            return (
              <div key={stage.key} className="flex gap-4">
                {/* Left rail */}
                <div className="flex flex-col items-center">
                  <StageNode
                    stage={stage}
                    index={i}
                    isCompleted={isCompleted}
                    isCurrent={isCurrent}
                    isInvalidTerminal={isInvalidTerminal}
                    size="sm"
                  />
                  {i < stages.length - 1 && <div className={`min-h-5 w-px flex-1 ${connectorColor}`} />}
                </div>

                {/* Label + meta */}
                <div className="min-w-0 pt-1 pb-5">
                  <span
                    className={`text-sm font-medium ${
                      isInvalidTerminal ? 'text-danger' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {info?.date && (
                    <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      {formatShortDate(info.date)}
                      {info.actor && <> · {info.actor}</>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invalid status banner */}
      {isInvalid && (
        <p className="mt-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
          This report was reviewed and marked as invalid. It will not progress further.
        </p>
      )}
    </section>
  );
}
