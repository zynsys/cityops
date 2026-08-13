"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface SubmissionSuccessProps {
  reportId: number;
  reportTitle: string;
  councilName: string;
  onReportAnother: () => void;
}

export default function SubmissionSuccess({
  reportId,
  councilName,
  onReportAnother,
}: SubmissionSuccessProps) {
  const shortRef = String(reportId);

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-6 py-16 text-center max-w-md mx-auto">
      {/* Success icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-foreground">Report submitted!</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Thanks for helping keep your community safe. Your report has been sent
          to <strong>{councilName}</strong> and will be reviewed shortly.
        </p>
      </div>

      {/* Reference chip */}
      <div
        className="px-4 py-2 rounded-md bg-muted border border-border font-mono text-sm text-foreground"
        aria-label={`Your report reference is ${shortRef}`}
      >
        Your reference: #{shortRef}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
        >
          View your report
        </Link>
        <button
          type="button"
          onClick={onReportAnother}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
        >
          Report another problem
        </button>
      </div>
    </div>
  );
}
