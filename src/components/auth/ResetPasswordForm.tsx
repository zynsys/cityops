'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one digit.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const inputClass = (hasError: boolean) => `input-field ${hasError ? 'border-danger' : 'border-border'}`;

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [success, setSuccess] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    setTopError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (json.error === 'invalid_or_expired_token') {
        setTopError('This reset link is no longer valid. Please request a new one.');
      } else {
        setTopError('Something went wrong. Please try again.');
      }
    } catch {
      setTopError('Something went wrong. Please try again.');
    }
  }

  if (success) {
    return (
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">Password Reset!</h1>
        <p role="status" className="page-description mb-8">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link href="/sign-in" className="btn-primary w-full">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="page-title mt-3">Reset Password</h1>
        <p className="page-description">Enter your new password below.</p>
      </header>

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
          <label htmlFor="password" className="field-label">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="········"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
            className={inputClass(!!errors.password)}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p id="password-error" className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="········"
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            {...register('confirmPassword')}
            className={inputClass(!!errors.confirmPassword)}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
