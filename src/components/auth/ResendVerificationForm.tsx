'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'loading' | 'sent' | 'error';

export default function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('loading');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('request_failed');
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm leading-relaxed text-success"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          If an account with that email exists and is unverified, a new verification email has been sent. Please check
          your inbox.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {state === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Something went wrong. Please try again.</span>
        </div>
      )}
      <div>
        <label htmlFor="resend-email" className="field-label">
          Email address
        </label>
        <input
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-field"
          disabled={state === 'loading'}
        />
      </div>
      <button type="submit" disabled={state === 'loading' || email.trim() === ''} className="btn-primary w-full">
        {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {state === 'loading' ? 'Sending…' : 'Resend Verification Email'}
      </button>
    </form>
  );
}
