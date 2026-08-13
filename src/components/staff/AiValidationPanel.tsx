import type { StaffReportDetail } from "@/db/queries/staff/reports";

type AiResult = StaffReportDetail["aiValidationResults"][0];

const REASON_CODE_LABELS: Record<string, string> = {
  category_mismatch: "Category Mismatch",
  image_irrelevant: "Image Irrelevant",
  image_unusable: "Image Unusable",
  spam: "Spam",
  abusive_content: "Abusive Content",
  duplicate_suspected: "Duplicate Suspected",
  manual_override: "Manual Override",
};

function reasonLabel(code: string): string {
  return (
    REASON_CODE_LABELS[code] ??
    code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  valid: { label: "Valid", bg: "bg-green-500/15", text: "text-green-400" },
  review_required: { label: "Needs Review", bg: "bg-yellow-500/15", text: "text-yellow-400" },
  invalid: { label: "Invalid", bg: "bg-red-500/15", text: "text-red-400" },
};

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg = OUTCOME_CONFIG[outcome] ?? {
    label: outcome,
    bg: "bg-muted",
    text: "text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

interface Props {
  aiResult: AiResult;
}

export default function AiValidationPanel({ aiResult }: Props) {
  const pct =
    aiResult.confidenceScore != null
      ? `${(Number(aiResult.confidenceScore) * 100).toFixed(0)}%`
      : null;

  const isAlreadyReviewed = aiResult.reviewedAt != null;
  const reasonBorderColor =
    aiResult.outcome === "invalid" ? "border-red-400" : "border-amber-400";

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Card header */}
      <div className="border-b border-border bg-muted/50 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          AI Validation
        </h2>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-3">
        {/* Outcome badge + confidence score */}
        <div className="flex items-center gap-2 flex-wrap">
          <OutcomeBadge outcome={aiResult.outcome} />
          {pct && (
            <span className="text-sm text-muted-foreground">
              Confidence: {pct}
            </span>
          )}
        </div>

        {/* Reason code pills */}
        {aiResult.reasonCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aiResult.reasonCodes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {reasonLabel(code)}
              </span>
            ))}
          </div>
        )}

        {/* Reason text blockquote */}
        {aiResult.reasonText && (
          <blockquote
            className={`border-l-4 pl-3 py-1 text-sm text-muted-foreground ${reasonBorderColor}`}
          >
            {aiResult.reasonText}
          </blockquote>
        )}

        {/* Awaiting review note (review_required, not yet reviewed) */}
        {aiResult.outcome === "review_required" && !isAlreadyReviewed && (
          <p className="text-xs text-muted-foreground italic">
            Awaiting manual review — see action below.
          </p>
        )}

        {/* Override summary (reviewed) */}
        {isAlreadyReviewed && aiResult.reviewOutcome && (
          <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Override:</span>
              <OutcomeBadge outcome={aiResult.reviewOutcome} />
            </div>
            {aiResult.reviewedBy && aiResult.reviewedAt && (
              <p className="text-muted-foreground">
                By {aiResult.reviewedBy.displayName} ·{" "}
                {formatDate(aiResult.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {/* Override badge for invalid with reviewOutcome (not yet marked reviewedAt) */}
        {!isAlreadyReviewed &&
          aiResult.outcome === "invalid" &&
          aiResult.reviewOutcome && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Override:</span>
              <OutcomeBadge outcome={aiResult.reviewOutcome} />
              {aiResult.reviewedBy && (
                <span className="text-xs text-muted-foreground">
                  {aiResult.reviewedBy.displayName}
                </span>
              )}
            </div>
          )}

        {/* Model version footnote */}
        {aiResult.modelVersion && (
          <p className="text-xs text-muted-foreground/70">
            Model: {aiResult.modelVersion}
          </p>
        )}
      </div>
    </div>
  );
}
