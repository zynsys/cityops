"use client";

import { useState } from "react";

type FormState = "idle" | "loading" | "sent" | "error";

export default function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("request_failed");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
        If an account with that email exists and is unverified, a new
        verification email has been sent. Please check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          Something went wrong. Please try again.
        </div>
      )}
      <div>
        <label
          htmlFor="resend-email"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Email address
        </label>
        <input
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={state === "loading"}
        />
      </div>
      <button
        type="submit"
        disabled={state === "loading" || email.trim() === ""}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "loading" ? "Sending…" : "Resend Verification Email"}
      </button>
    </form>
  );
}
