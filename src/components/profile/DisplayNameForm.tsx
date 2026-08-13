"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

interface DisplayNameFormProps {
  initialDisplayName: string;
}

export default function DisplayNameForm({ initialDisplayName }: DisplayNameFormProps) {
  const [value, setValue] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear the success timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: value.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.details?.[0] ?? "Failed to update display name. Please try again.");
        return;
      }
      setSaved(true);
      timerRef.current = setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const unchanged = value.trim() === initialDisplayName.trim();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          minLength={2}
          maxLength={150}
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || unchanged}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {saved && (
          <span role="status" className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Display name updated
          </span>
        )}

        {error && (
          <span role="alert" className="flex items-center gap-1 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
