'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const inputClass = (hasError: boolean) => `input-field ${hasError ? 'border-danger' : 'border-border'}`;

export default function ForgotPasswordForm() {
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setTopError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (res.ok) {
        setSuccessEmail(data.email);
        return;
      }

      setTopError('Something went wrong. Please try again.');
    } catch {
      setTopError('Something went wrong. Please try again.');
    }
  }

  // Success state
  if (successEmail) {
    return (
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">Check your email</h1>
        <p role="status" className="page-description mb-8">
          If an account exists for <span className="break-all font-medium text-foreground">{successEmail}</span>,
          we&apos;ve sent a password reset link. The link expires in 1 hour.
        </p>
        <Link href="/sign-in" className="btn-primary w-full">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="page-title mt-3">Forgot Password</h1>
        <p className="page-description">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </header>

      {/* Top-level error alert */}
      {topError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{topError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className={inputClass(!!errors.email)}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p id="email-error" className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.email.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
        Remember your password?{' '}
        <Link href="/sign-in" className="rounded-sm font-semibold text-accent underline-offset-4 hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
