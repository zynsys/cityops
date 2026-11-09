"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  acceptInvitationFormSchema,
  type AcceptInvitationFormInput,
} from "@/lib/validations/invitations";

interface AcceptInvitationFormProps {
  token?: string;
}

interface InvitationPreview {
  email: string;
  tenantName: string;
  role: string;
}

const inputClass = (hasError: boolean) =>
  `input-field ${hasError ? "border-danger" : "border-border"}`;

function messageForError(error: string | undefined): string {
  if (error === "invitation_expired") return "This invitation has expired. Ask your council administrator for a new one.";
  if (error === "email_already_exists") return "An account with this email already exists. Please sign in instead.";
  return "This invitation is invalid or has already been used. Ask your council administrator for a new one.";
}

export default function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormInput>({
    resolver: zodResolver(acceptInvitationFormSchema),
  });

  useEffect(() => {
    if (!token) {
      setPageError(messageForError(undefined));
      setIsLoading(false);
      return;
    }

    let active = true;
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as InvitationPreview;
      })
      .then((data) => {
        if (active) setInvitation(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setPageError(messageForError(error instanceof Error ? error.message : undefined));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(data: AcceptInvitationFormInput) {
    if (!token) return;
    setPageError(null);
    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          displayName: data.displayName,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const result: { error?: string } = await response.json();
        setPageError(messageForError(result.error));
        return;
      }

      setSuccess(true);
    } catch {
      setPageError("We couldn't accept your invitation. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="w-full">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="page-title">You&apos;re all set</h1>
        <p role="status" className="page-description mb-8">
          Your CityOps account is ready. Sign in to continue to {invitation?.tenantName}.
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
        <p className="eyebrow">CityOps team access</p>
        <h1 className="page-title mt-3">Accept your invitation</h1>
        <p className="page-description">
          {isLoading
            ? "Checking your invitation…"
            : invitation
              ? `Join ${invitation.tenantName} as ${invitation.role.replaceAll("_", " ")}.`
              : "Complete your account setup using the invitation sent to your email."}
        </p>
      </header>

      {pageError && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{pageError}</span>
        </div>
      )}

      {invitation && (
        <>
          <p className="mb-6 break-all text-sm text-muted-foreground">
            Invited email: <span className="font-medium text-foreground">{invitation.email}</span>
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="displayName" className="field-label">Full name</label>
              <input
                id="displayName"
                autoComplete="name"
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? "displayName-error" : undefined}
                disabled={isSubmitting}
                {...register("displayName")}
                className={inputClass(Boolean(errors.displayName))}
              />
              {errors.displayName && <p id="displayName-error" className="mt-2 text-xs text-danger">{errors.displayName.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={isSubmitting}
                {...register("password")}
                className={inputClass(Boolean(errors.password))}
              />
              {errors.password && <p id="password-error" className="mt-2 text-xs text-danger">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="field-label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                disabled={isSubmitting}
                {...register("confirmPassword")}
                className={inputClass(Boolean(errors.confirmPassword))}
              />
              {errors.confirmPassword && <p id="confirmPassword-error" className="mt-2 text-xs text-danger">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Setting up account…" : "Accept invitation"}
            </button>
          </form>
        </>
      )}

      {!invitation && !isLoading && (
        <Link href="/sign-in" className="btn-secondary mt-2 w-full">
          Go to Sign In
        </Link>
      )}
    </div>
  );
}
