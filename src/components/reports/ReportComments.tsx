import { MessageCircle, User } from "lucide-react";
import type { ReportDetail } from "@/db/queries/reports";

type Comment = ReportDetail["comments"][number];

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

interface ReportCommentsProps {
  comments: Comment[];
}

export default function ReportComments({ comments }: ReportCommentsProps) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <MessageCircle className="h-5 w-5" />
        Comments
        {comments.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            ({comments.length})
          </span>
        )}
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {comment.user.displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
