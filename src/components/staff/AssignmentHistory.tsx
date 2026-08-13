"use client";

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
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssignmentHistory({ assignments }: AssignmentHistoryProps) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors list-none">
        <svg
          className="h-3 w-3 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Assignment history ({assignments.length})
      </summary>

      <div className="mt-2 space-y-2">
        {assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No assignments yet.</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium text-foreground">{a.assignedTo.displayName}</p>
              <p className="text-xs text-muted-foreground">
                by {a.assignedBy.displayName} · {formatDate(a.assignedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
