'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface SubmissionSuccessProps {
  reportId: number;
  reportTitle: string;
  councilName: string;
  onReportAnother: () => void;
}

export default function SubmissionSuccess({
  reportId,
  reportTitle,
  councilName,
  onReportAnother,
}: SubmissionSuccessProps) {
  const shortRef = String(reportId);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="surface-card m-auto flex w-full max-w-xl shrink-0 flex-col items-center gap-6 p-6 text-center sm:p-8">
        {/* Success icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-success/20 bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" aria-hidden="true" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Report submitted</h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Thanks for helping keep your community safe. Your report has been sent to{' '}
            <strong className="font-semibold text-foreground">{councilName}</strong> and will be reviewed shortly.
          </p>
        </div>

        {/* Reference chip */}
        <div
          className="w-full rounded-xl border border-border bg-background px-5 py-4 text-foreground"
          aria-label={`Your report reference is ${shortRef}`}
        >
          <p className="font-mono text-sm">Your reference: #{shortRef}</p>
          <p className="mt-2 text-sm leading-relaxed font-medium wrap-break-word">{reportTitle}</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
          <Link href={`/reports/${reportId}`} className="btn-primary sm:flex-1">
            View your report
          </Link>
          <button type="button" onClick={onReportAnother} className="btn-secondary sm:flex-1">
            Report another problem
          </button>
        </div>
      </div>
    </div>
  );
}
