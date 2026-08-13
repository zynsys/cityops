"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { registerFormSchema, type RegisterFormInput } from "@/lib/validations/auth";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${
    hasError ? "border-red-500" : "border-border"
  }`;

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setError("email", {
          message: "An account with this email address already exists.",
        });
        return;
      }

      setTopError("Registration failed. Please try again.");
    } catch {
      setTopError("Registration failed. Please try again.");
    }
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Check your email
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We&apos;ve sent a verification link to{" "}
          <span className="font-medium text-foreground">{success}</span>. Please
          click the link to activate your account.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Create Account</h1>

      {/* Top-level error alert */}
      {topError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{topError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Display Name */}
        <div>
          <label
            htmlFor="displayName"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            aria-invalid={errors.displayName ? "true" : "false"}
            aria-describedby={errors.displayName ? "displayName-error" : undefined}
            disabled={isSubmitting}
            {...register("displayName")}
            className={inputClass(!!errors.displayName)}
          />
          <FieldError id="displayName-error" message={errors.displayName?.message} />
        </div>

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
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            {...register("email")}
            className={inputClass(!!errors.email)}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={isSubmitting}
            {...register("password")}
            className={inputClass(!!errors.password)}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            disabled={isSubmitting}
            {...register("confirmPassword")}
            className={inputClass(!!errors.confirmPassword)}
          />
          <FieldError id="confirmPassword-error" message={errors.confirmPassword?.message} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
