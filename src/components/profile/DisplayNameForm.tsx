'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: value.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.details?.[0] ?? 'Failed to update display name. Please try again.');
        return;
      }
      setSaved(true);
      timerRef.current = setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const unchanged = value.trim() === initialDisplayName.trim();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="displayName" className="field-label">
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
          className="input-field"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || unchanged} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save'}
        </button>

        {saved && (
          <span role="status" className="flex items-start gap-2 text-sm leading-relaxed text-success">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Display name updated
          </span>
        )}

        {error && (
          <span role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
