'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { registerFormSchema, type RegisterFormInput } from '@/lib/validations/auth';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const inputClass = (hasError: boolean) => `input-field ${hasError ? 'border-danger' : 'border-border'}`;

export default function RegisterForm() {
  const [success, setSuccess] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  async function onSubmit(data: RegisterFormInput) {
    setTopError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: data.displayName,
          email: data.email,
          password: data.password,
        }),
      });

      if (res.ok) {
        setSuccess(data.email);
        return;
      }

      if (res.status === 409) {
        setError('email', {
          message: 'An account with this email address already exists.',
        });
        return;
      }

      setTopError('Registration failed. Please try again.');
    } catch {
      setTopError('Registration failed. Please try again.');
    }
  }

  // Success state
  if (success) {
    return (
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">Check your email</h1>
        <p role="status" className="page-description mb-8">
          We&apos;ve sent a verification link to{' '}
          <span className="break-all font-medium text-foreground">{success}</span>. Please click the link to activate
          your account.
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
        <p className="eyebrow">Welcome to CityOps</p>
        <h1 className="page-title mt-3">Create Account</h1>
        <p className="page-description">Report local issues and follow their progress with your CityOps account.</p>
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
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="field-label">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            aria-invalid={errors.displayName ? 'true' : 'false'}
            aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            disabled={isSubmitting}
            {...register('displayName')}
            className={inputClass(!!errors.displayName)}
          />
          <FieldError id="displayName-error" message={errors.displayName?.message} />
        </div>

        {/* Email */}
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
            disabled={isSubmitting}
            {...register('email')}
            className={inputClass(!!errors.email)}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={isSubmitting}
            {...register('password')}
            className={inputClass(!!errors.password)}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            disabled={isSubmitting}
            {...register('confirmPassword')}
            className={inputClass(!!errors.confirmPassword)}
          />
          <FieldError id="confirmPassword-error" message={errors.confirmPassword?.message} />
        </div>

        {/* Submit */}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="mt-8 border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="rounded-sm font-semibold text-accent underline-offset-4 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
