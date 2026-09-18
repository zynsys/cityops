'use client';

import { ChevronRight, History } from 'lucide-react';

interface AssignmentRecord {
  id: string;
  assignedAt: Date;
  assignedTo: { displayName: string };
  assignedBy: { displayName: string };
}

interface AssignmentHistoryProps {
  assignments: AssignmentRecord[];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssignmentHistory({ assignments }: AssignmentHistoryProps) {
  return (
    <details className="surface-card group p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <History className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        Assignment history ({assignments.length})
        <ChevronRight
          className="ml-auto h-4.5 w-4.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-3 space-y-3 border-t border-border pt-4">
        {assignments.length === 0 ? (
          <p className="rounded-xl bg-muted/30 px-4 py-4 text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{a.assignedTo.displayName}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                by {a.assignedBy.displayName} · {formatDate(a.assignedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
