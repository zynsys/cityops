"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

interface ChangePasswordCardProps {
  email: string;
}

export default function ChangePasswordCard({ email }: ChangePasswordCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success regardless of response (anti-enumeration)
      setSent(true);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      {sent ? (
        <p role="status" className="flex items-start gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          Reset link sent — check your inbox.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
        >
          {sending ? "Sending…" : "Send reset link"}
        </button>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
