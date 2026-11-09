"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  invitationRequestSchema,
  type InvitationRequestInput,
} from "@/lib/validations/invitations";

export default function InviteUserForm() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationRequestInput>({
    resolver: zodResolver(invitationRequestSchema),
    defaultValues: { role: "authority_user" },
  });

  async function onSubmit(data: InvitationRequestInput) {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/staff/users/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: { email?: string; error?: string } = await response.json();
      if (!response.ok) {
        setError(
          result.error === "email_already_exists"
            ? "An account with this email already exists."
            : "We couldn't create the invitation. Please try again."
        );
        return;
      }

      setSuccess(`An invitation was created for ${result.email}.`);
      reset({ role: "authority_user", email: "" });
    } catch {
      setError("We couldn't create the invitation. Please try again.");
    }
  }

  return (
    <div className="surface-card max-w-2xl p-6 sm:p-8">
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <p role="status" className="mb-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="field-label">Work email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            {...register("email")}
            className={`input-field ${errors.email ? "border-danger" : "border-border"}`}
          />
          {errors.email && <p id="email-error" className="mt-2 text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="role" className="field-label">Role</label>
          <select
            id="role"
            aria-invalid={Boolean(errors.role)}
            disabled={isSubmitting}
            {...register("role")}
            className="input-field border-border"
          >
            <option value="authority_user">Authority user</option>
            <option value="tenant_admin">Tenant admin</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Creating invitation…" : "Invite user"}
        </button>
      </form>
    </div>
  );
}
