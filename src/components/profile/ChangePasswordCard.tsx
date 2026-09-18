'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';

interface ChangePasswordCardProps {
  email: string;
}

export default function ChangePasswordCard({ email }: ChangePasswordCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success regardless of response (anti-enumeration)
      setSent(true);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3 sm:max-w-xs">
      {sent ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm leading-relaxed text-success"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Reset link sent — check your inbox.
        </p>
      ) : (
        <button type="button" onClick={handleSend} disabled={sending} className="btn-secondary w-full sm:w-auto">
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mail className="h-4 w-4" aria-hidden="true" />
          )}
          {sending ? 'Sending…' : 'Send reset link'}
        </button>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
