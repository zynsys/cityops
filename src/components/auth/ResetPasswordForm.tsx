"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one digit."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${
    hasError ? "border-red-500" : "border-border"
  }`;

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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (json.error === "invalid_or_expired_token") {
        setTopError(
          "This reset link is no longer valid. Please request a new one."
        );
      } else {
        setTopError("Something went wrong. Please try again.");
      }
    } catch {
      setTopError("Something went wrong. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Password Reset!
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Your password has been updated. You can now sign in with your new
          password.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Reset Password
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your new password below.
      </p>

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
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="········"
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
            className={inputClass(!!errors.password)}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p
              id="password-error"
              className="mt-1.5 flex items-center gap-1 text-xs text-red-400"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="········"
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            {...register("confirmPassword")}
            className={inputClass(!!errors.confirmPassword)}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              className="mt-1.5 flex items-center gap-1 text-xs text-red-400"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
