import { getPriorityConfig } from '@/lib/reportStatusConfig';

const PRIORITY_TONES: Record<string, string> = {
  critical: 'bg-danger/10 text-danger',
  high: 'bg-warning/10 text-warning',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-success/10 text-success',
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  const { label } = getPriorityConfig(priority);

  return (
    <span className={`status-badge ${PRIORITY_TONES[priority ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
