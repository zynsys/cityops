"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${
    hasError ? "border-red-500" : "border-border"
  }`;

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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (res.ok) {
        setSuccessEmail(data.email);
        return;
      }

      setTopError("Something went wrong. Please try again.");
    } catch {
      setTopError("Something went wrong. Please try again.");
    }
  }

  // Success state
  if (successEmail) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Check your email
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{successEmail}</span>,
          we&apos;ve sent a password reset link. The link expires in 1 hour.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Forgot Password
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

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
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
            className={inputClass(!!errors.email)}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p
              id="email-error"
              className="mt-1.5 flex items-center gap-1 text-xs text-red-400"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
