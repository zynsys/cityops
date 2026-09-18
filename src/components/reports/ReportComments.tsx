import { MessageCircle, User } from 'lucide-react';
import type { ReportDetail } from '@/db/queries/reports';

type Comment = ReportDetail['comments'][number];

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

interface ReportCommentsProps {
  comments: Comment[];
}

export default function ReportComments({ comments }: ReportCommentsProps) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
        <MessageCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        Comments
        {comments.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            ({comments.length})
          </span>
        )}
      </h2>

      {comments.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-background/50 px-5 py-8 text-center text-sm text-muted-foreground">
          No comments yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-border bg-background/50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                  <span className="break-words text-sm font-medium text-foreground">{comment.user.displayName}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {formatRelativeTime(new Date(comment.createdAt))}
                  </span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-foreground">{comment.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
