'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';

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
    <div className="space-y-3 mt-4">
      {/* Optimistically rendered new comments */}
      {newComments.map((comment) => (
        <div
          key={comment.id}
          className={
            comment.isInternal
              ? 'rounded-lg bg-muted border-l-4 border-accent/40 p-4'
              : 'rounded-lg border border-border bg-surface p-4'
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border">
              <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-foreground">{comment.user.displayName}</span>
            {comment.isInternal && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Internal</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelativeTime(new Date(comment.createdAt))}
            </span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
        </div>
      ))}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-4 space-y-3">
        {/* Mode toggle */}
        <div
          className="flex rounded-md border border-border overflow-hidden text-xs font-medium"
          role="group"
          aria-label="Comment visibility"
        >
          <button
            type="button"
            onClick={() => setIsInternal(true)}
            className={`flex-1 px-3 py-1.5 transition-colors ${
              isInternal ? 'bg-accent text-white' : 'bg-surface text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={isInternal}
          >
            Internal note
          </button>
          <button
            type="button"
            onClick={() => setIsInternal(false)}
            className={`flex-1 px-3 py-1.5 transition-colors ${
              !isInternal ? 'bg-accent text-white' : 'bg-surface text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={!isInternal}
          >
            Public reply
          </button>
        </div>

        {/* Textarea */}
        <div>
          <label htmlFor={`comment-body-${reportId}`} className="sr-only">
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
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent
                       disabled:opacity-50"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
            {body.length} / {MAX_BODY}
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400" role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!trimmed || isSubmitting}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-white
                       hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            {isSubmitting ? <span aria-live="polite">Posting…</span> : 'Post comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
