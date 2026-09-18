'use client';

import { MapPin, Pencil, Loader2, AlertTriangle } from 'lucide-react';

export type DetectionStatus = 'idle' | 'loading' | 'matched' | 'unmatched' | 'error';

interface CouncilDetectionChipProps {
  status: DetectionStatus;
  councilName?: string;
  onEdit?: () => void;
}

export default function CouncilDetectionChip({ status, councilName, onEdit }: CouncilDetectionChipProps) {
  if (status === 'idle') return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {status === 'loading' && (
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" />
          <span>Detecting council…</span>
        </div>
      )}

      {status === 'matched' && councilName && (
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-2 text-sm leading-relaxed text-success">
          <MapPin size={16} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong>{councilName}</strong> will handle this report
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Change council"
              type="button"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {status === 'unmatched' && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>No council boundary found — please select your council</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Could not auto-detect council — please select manually</span>
        </div>
      )}
    </div>
  );
}
