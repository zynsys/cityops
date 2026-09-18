'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, X } from 'lucide-react';
import Link from 'next/link';

// Roles whose post-login landing page is the staff console. platform_admin is
// intentionally excluded — it cannot access /staff/* (see middleware.ts and
// src/app/staff/layout.tsx), so routing it there would bounce it to /403.
const STAFF_ROLES = new Set(['authority_user', 'tenant_admin']);

function isRelativePath(url: string): boolean {
  return !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//');
}

function getRoleDestination(role: string | undefined): string {
  if (role && STAFF_ROLES.has(role)) return '/staff/reports';
  return '/';
}

export default function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl') ?? '';
  // Only honour callbackUrl if it's a relative path; otherwise role-based redirect applies
  const explicitCallbackUrl = rawCallbackUrl && isRelativePath(rawCallbackUrl) ? rawCallbackUrl : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    let valid = true;

    if (!email) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDismissed(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error === 'CredentialsSignin') {
        setError('Invalid email or password. Please try again.');
      } else if (result?.error) {
        setError('Something went wrong. Please try again.');
      } else {
        // Resolve destination: explicit callbackUrl wins; otherwise role-based default
        if (explicitCallbackUrl) {
          window.location.href = explicitCallbackUrl;
        } else {
          const session = await getSession();
          const role = (session?.user as { role?: string } | undefined)?.role;
          window.location.href = getRoleDestination(role);
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <header className="mb-8">
        <p className="eyebrow">Welcome back</p>
        <h1 className="page-title mt-3">Sign In</h1>
        <p className="page-description">Access your CityOps account to pick up where you left off.</p>
      </header>

      {/* Error Alert */}
      {error && !dismissed && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setDismissed(true)}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
            disabled={loading}
            className={`input-field ${emailError ? 'border-danger' : 'border-border'}`}
          />
          {emailError && (
            <p id="email-error" className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="field-label mb-0">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs font-medium text-accent underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={passwordError ? 'true' : 'false'}
            aria-describedby={passwordError ? 'password-error' : undefined}
            disabled={loading}
            className={`input-field ${passwordError ? 'border-danger' : 'border-border'}`}
          />
          {passwordError && (
            <p id="password-error" className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="mt-8 border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="rounded-sm font-semibold text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
