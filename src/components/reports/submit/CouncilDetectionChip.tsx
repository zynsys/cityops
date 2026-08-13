"use client";

import { MapPin, Pencil, Loader2, AlertTriangle } from "lucide-react";

export type DetectionStatus = "idle" | "loading" | "matched" | "unmatched" | "error";

interface CouncilDetectionChipProps {
  status: DetectionStatus;
  councilName?: string;
  onEdit?: () => void;
}

export default function CouncilDetectionChip({
  status,
  councilName,
  onEdit,
}: CouncilDetectionChipProps) {
  if (status === "idle") return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {status === "loading" && (
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span>Detecting council…</span>
        </div>
      )}

      {status === "matched" && councilName && (
        <div className="flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-400 dark:text-green-300">
          <MapPin size={14} className="shrink-0" />
          <span>
            <strong>{councilName}</strong> will handle this report
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="ml-1 rounded p-0.5 hover:bg-green-500/20 transition-colors"
              aria-label="Change council"
              type="button"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}

      {status === "unmatched" && (
        <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-400 dark:text-amber-300">
          <AlertTriangle size={14} className="shrink-0" />
          <span>No council boundary found — please select your council</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400 dark:text-red-300">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Could not auto-detect council — please select manually</span>
        </div>
      )}
    </div>
  );
}
