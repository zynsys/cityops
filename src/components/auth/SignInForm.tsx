"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, X } from "lucide-react";
import Link from "next/link";

// Roles whose post-login landing page is the staff console. platform_admin is
// intentionally excluded — it cannot access /staff/* (see middleware.ts and
// src/app/staff/layout.tsx), so routing it there would bounce it to /403.
const STAFF_ROLES = new Set(["authority_user", "tenant_admin"]);

function isRelativePath(url: string): boolean {
  return (
    !url.startsWith("http://") &&
    !url.startsWith("https://") &&
    !url.startsWith("//")
  );
}

function getRoleDestination(role: string | undefined): string {
  if (role && STAFF_ROLES.has(role)) return "/staff/reports";
  return "/";
}

export default function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") ?? "";
  // Only honour callbackUrl if it's a relative path; otherwise role-based redirect applies
  const explicitCallbackUrl =
    rawCallbackUrl && isRelativePath(rawCallbackUrl) ? rawCallbackUrl : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    let valid = true;

    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDismissed(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === "CredentialsSignin") {
        setError("Invalid email or password. Please try again.");
      } else if (result?.error) {
        setError("Something went wrong. Please try again.");
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
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Sign In</h1>

      {/* Error Alert */}
      {error && !dismissed && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setDismissed(true)}
            className="shrink-0 text-red-400/70 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? "true" : "false"}
            aria-describedby={emailError ? "email-error" : undefined}
            disabled={loading}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${
              emailError ? "border-red-500" : "border-border"
            }`}
          />
          {emailError && (
            <p id="email-error" className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
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
            aria-invalid={passwordError ? "true" : "false"}
            aria-describedby={passwordError ? "password-error" : undefined}
            disabled={loading}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${
              passwordError ? "border-red-500" : "border-border"
            }`}
          />
          {passwordError && (
            <p id="password-error" className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
