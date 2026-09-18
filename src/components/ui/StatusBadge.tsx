import { getStatusConfig } from '@/lib/reportStatusConfig';

const STATUS_TONES: Record<string, string> = {
  created: 'bg-info/10 text-info',
  under_validation: 'bg-warning/10 text-warning',
  validated: 'bg-info/10 text-info',
  invalid: 'bg-danger/10 text-danger',
  assigned: 'bg-violet-500/10 text-violet-800 dark:text-violet-300',
  in_progress: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const { label } = getStatusConfig(status);
  return (
    <span className={`status-badge ${STATUS_TONES[status] ?? 'bg-muted text-muted-foreground'} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
