'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, LockKeyhole, Send, User } from 'lucide-react';

const MAX_BODY = 2000;

interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  user: { displayName: string; avatarUrl: string | null };
}

interface CommentFormProps {
  reportId: number;
  currentUserDisplayName: string;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function CommentForm({ reportId }: CommentFormProps) {
  const router = useRouter();
  const [isInternal, setIsInternal] = useState(true);
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComments, setNewComments] = useState<Comment[]>([]);

  const trimmed = body.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, isInternal }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to post comment');
        return;
      }

      const data = (await res.json()) as { comment: Comment };
      setNewComments((prev) => [...prev, data.comment]);
      setBody('');
      router.refresh();
      // Clear optimistic comments after refresh so server data is the source of truth.
      // Without this, the comment appears twice: once in newComments and once from the
      // server-refreshed ReportComments list.
      setNewComments([]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Optimistically rendered new comments */}
      {newComments.map((comment) => (
        <div
          key={comment.id}
          className={
            comment.isInternal
              ? 'rounded-xl border border-border border-l-2 border-l-accent/50 bg-muted/30 p-4'
              : 'rounded-xl border border-border bg-background/50 p-4'
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
              <User className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground">{comment.user.displayName}</span>
            {comment.isInternal && <span className="status-badge bg-accent/10 text-accent">Internal</span>}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelativeTime(new Date(comment.createdAt))}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.body}</p>
        </div>
      ))}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        {/* Mode toggle */}
        <div
          className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 text-xs font-medium sm:text-sm"
          role="group"
          aria-label="Comment visibility"
        >
          <button
            type="button"
            onClick={() => setIsInternal(true)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              isInternal
                ? 'bg-accent text-accent-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            aria-pressed={isInternal}
          >
            <LockKeyhole className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            Internal note
          </button>
          <button
            type="button"
            onClick={() => setIsInternal(false)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              !isInternal
                ? 'bg-accent text-accent-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            aria-pressed={!isInternal}
          >
            <Globe className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            Public reply
          </button>
        </div>

        {/* Textarea */}
        <div>
          <label htmlFor={`comment-body-${reportId}`} className="field-label">
            Write a comment
          </label>
          <textarea
            id={`comment-body-${reportId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            maxLength={MAX_BODY}
            disabled={isSubmitting}
            className="input-field min-h-[120px] w-full resize-y disabled:opacity-50"
          />
          <p className="mt-2 text-right text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {body.length} / {MAX_BODY}
          </p>
        </div>

        {/* Error */}
        {error && (
          <p
            className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!trimmed || isSubmitting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4.5 w-4.5" aria-hidden="true" />
            {isSubmitting ? <span aria-live="polite">Posting…</span> : 'Post comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
