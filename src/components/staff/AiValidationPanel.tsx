import { ScanLine } from 'lucide-react';
import type { StaffReportDetail } from '@/db/queries/staff/reports';

type AiResult = StaffReportDetail['aiValidationResults'][0];

const REASON_CODE_LABELS: Record<string, string> = {
  category_mismatch: 'Category Mismatch',
  image_irrelevant: 'Image Irrelevant',
  image_unusable: 'Image Unusable',
  spam: 'Spam',
  abusive_content: 'Abusive Content',
  duplicate_suspected: 'Duplicate Suspected',
  manual_override: 'Manual Override',
};

function reasonLabel(code: string): string {
  return REASON_CODE_LABELS[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  valid: { label: 'Valid', bg: 'bg-success/10', text: 'text-success' },
  review_required: { label: 'Needs Review', bg: 'bg-warning/10', text: 'text-warning' },
  invalid: { label: 'Invalid', bg: 'bg-danger/10', text: 'text-danger' },
};

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg = OUTCOME_CONFIG[outcome] ?? {
    label: outcome,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  };
  return (
    <span className={`status-badge ${cfg.bg} ${cfg.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

interface Props {
  aiResult: AiResult;
}

export default function AiValidationPanel({ aiResult }: Props) {
  const pct = aiResult.confidenceScore != null ? `${(Number(aiResult.confidenceScore) * 100).toFixed(0)}%` : null;

  const isAlreadyReviewed = aiResult.reviewedAt != null;
  const reasonBorderColor = aiResult.outcome === 'invalid' ? 'border-danger/40' : 'border-warning/40';

  return (
    <div className="surface-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 border-b border-border px-5 py-5">
        <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-foreground">AI validation</h2>
          <p className="mt-1 text-xs text-muted-foreground">Automated report assessment</p>
        </div>
      </div>

      {/* Card body */}
      <div className="space-y-4 px-5 py-5">
        {/* Outcome badge + confidence score */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OutcomeBadge outcome={aiResult.outcome} />
          {pct && (
            <span className="text-xs text-muted-foreground">
              Confidence: <span className="font-semibold text-foreground tabular-nums">{pct}</span>
            </span>
          )}
        </div>

        {/* Reason code pills */}
        {aiResult.reasonCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aiResult.reasonCodes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {reasonLabel(code)}
              </span>
            ))}
          </div>
        )}

        {/* Reason text blockquote */}
        {aiResult.reasonText && (
          <blockquote
            className={`rounded-r-lg border-l-2 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground ${reasonBorderColor}`}
          >
            {aiResult.reasonText}
          </blockquote>
        )}

        {/* Awaiting review note (review_required, not yet reviewed) */}
        {aiResult.outcome === 'review_required' && !isAlreadyReviewed && (
          <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-3 text-xs leading-relaxed text-warning">
            Awaiting manual review — see action below.
          </p>
        )}

        {/* Override summary (reviewed) */}
        {isAlreadyReviewed && aiResult.reviewOutcome && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Override:</span>
              <OutcomeBadge outcome={aiResult.reviewOutcome} />
            </div>
            {aiResult.reviewedBy && aiResult.reviewedAt && (
              <p className="text-muted-foreground">
                By {aiResult.reviewedBy.displayName} · {formatDate(aiResult.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {/* Override badge for invalid with reviewOutcome (not yet marked reviewedAt) */}
        {!isAlreadyReviewed && aiResult.outcome === 'invalid' && aiResult.reviewOutcome && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Override:</span>
            <OutcomeBadge outcome={aiResult.reviewOutcome} />
            {aiResult.reviewedBy && (
              <span className="text-xs text-muted-foreground">{aiResult.reviewedBy.displayName}</span>
            )}
          </div>
        )}

        {/* Model version footnote */}
        {aiResult.modelVersion && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">Model: {aiResult.modelVersion}</p>
        )}
      </div>
    </div>
  );
}
