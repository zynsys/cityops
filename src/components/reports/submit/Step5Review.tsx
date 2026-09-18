'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, X, MapPin, Building2, FileText, ImageIcon, Pencil, AlertCircle } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useReportSubmission } from './ReportSubmissionContext';
import ReviewMiniMap from './ReviewMiniMap';
import SubmissionSuccess from './SubmissionSuccess';
import DuplicateWarning, { type SimilarReportCandidate } from './DuplicateWarning';

const DRAFT_KEY = 'cityops:wizard:draft';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Step5ReviewProps {
  onBack: () => void;
  onGoToStep: (step: number) => void;
}

interface SubmittedReport {
  id: number;
  title: string;
  status: string;
}

export default function Step5Review({ onBack, onGoToStep }: Step5ReviewProps) {
  const { state, dispatch } = useReportSubmission();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);

  // Duplicate detection state
  const [duplicateCandidates, setDuplicateCandidates] = useState<SimilarReportCandidate[]>([]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Object URLs for previews — managed via useEffect so React Strict Mode
  // cleanup→recreate cycle triggers a re-render with valid URLs.
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = state.attachments.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [state.attachments]);

  // Run duplicate check on mount when required location/category data is available
  useEffect(() => {
    if (state.lat === null || state.lng === null || !state.categoryId || !state.title) {
      return;
    }

    const params = new URLSearchParams({
      lat: String(state.lat),
      lng: String(state.lng),
      categoryId: state.categoryId,
      title: state.title,
    });
    if (state.tenantId) params.set('tenantId', state.tenantId);

    let cancelled = false;
    fetch(`/api/reports/similar?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { candidates: SimilarReportCandidate[] } | null) => {
        if (!cancelled && data?.candidates?.length) {
          setDuplicateCandidates(data.candidates);
        }
      })
      .catch(() => {
        // Duplicate check is advisory — silently ignore errors
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRemovePhoto(index: number) {
    dispatch({
      type: 'SET_ATTACHMENTS',
      attachments: state.attachments.filter((_, i) => i !== index),
    });
  }

  async function handleSubmit() {
    if (state.lat === null || state.lng === null || !state.tenantId || !state.categoryId) {
      setError('Some required information is missing. Please go back and complete all steps.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        tenantId: state.tenantId,
        categoryId: state.categoryId,
        title: state.title,
        description: state.description,
        locationText: state.locationText || undefined,
        lat: state.lat,
        lng: state.lng,
      }),
    );
    for (const file of state.attachments) {
      formData.append('attachments[]', file);
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Save wizard state to sessionStorage so it can be restored after sign-in
          try {
            const photos = await Promise.all(
              state.attachments.map(async (f) => ({
                name: f.name,
                type: f.type,
                dataUrl: await fileToDataUrl(f),
              })),
            );
            sessionStorage.setItem(
              DRAFT_KEY,
              JSON.stringify({
                lat: state.lat,
                lng: state.lng,
                tenantId: state.tenantId,
                tenantName: state.tenantName,
                categoryId: state.categoryId,
                categoryName: state.categoryName,
                title: state.title,
                description: state.description,
                locationText: state.locationText,
                photos,
              }),
            );
          } catch {
            // If serialization fails (e.g. quota exceeded), redirect anyway without draft
          }
          router.push('/sign-in?callbackUrl=/reports/new');
          return;
        }
        const message =
          res.status === 400
            ? 'Some information is invalid. Please review your submission.'
            : 'Something went wrong. Please try again.';
        setError(message);
        return;
      }

      setSubmittedReport(json.report as SubmittedReport);
    } catch {
      setError('A network error occurred. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReportAnother() {
    window.location.href = '/reports/new';
  }

  // —— Success screen ——
  if (submittedReport) {
    return (
      <SubmissionSuccess
        reportId={submittedReport.id}
        reportTitle={submittedReport.title}
        councilName={state.tenantName ?? 'your council'}
        onReportAnother={handleReportAnother}
      />
    );
  }

  // —— Review card ——
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div>
            <p className="eyebrow mb-2">Step 5 · Review</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Review your report</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Check everything looks correct before submitting.
            </p>
          </div>

          {/* Duplicate warning */}
          {duplicateCandidates.length > 0 && !duplicateDismissed && (
            <DuplicateWarning candidates={duplicateCandidates} onDismiss={() => setDuplicateDismissed(true)} />
          )}

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-3 sm:p-4"
            >
              <AlertCircle className="mt-3 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <span className="min-w-0 flex-1 py-2 text-sm leading-relaxed text-danger">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Review sections */}
          <div className="surface-card flex flex-col divide-y divide-border overflow-hidden">
            {/* 1. Photos */}
            <ReviewSection
              icon={<ImageIcon className="w-4 h-4" aria-hidden="true" />}
              label="Photos"
              onEdit={() => onGoToStep(1)}
            >
              {state.attachments.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-3">
                  {state.attachments.map((file, i) => {
                    const url = previewUrls[i];
                    if (!url) return null;
                    return (
                      <div key={`${file.name}-${file.size}`} className="relative h-24 w-24 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={file.name}
                          className="h-24 w-24 rounded-xl border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          aria-label={`Remove ${file.name}`}
                          className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface/95 text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No photos attached.</p>
              )}
            </ReviewSection>

            {/* 2. Location */}
            <ReviewSection
              icon={<MapPin className="w-4 h-4" aria-hidden="true" />}
              label="Location"
              onEdit={() => onGoToStep(2)}
            >
              {state.lat !== null && state.lng !== null ? (
                <>
                  <div className="mt-1 h-44 w-full overflow-hidden rounded-xl border border-border sm:h-48">
                    <ReviewMiniMap lat={state.lat} lng={state.lng} />
                  </div>
                  {state.locationText && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{state.locationText}</p>
                  )}
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {state.lat.toFixed(5)}, {state.lng.toFixed(5)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No location selected.</p>
              )}
            </ReviewSection>

            {/* 3. Council */}
            <ReviewSection
              icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
              label="Council"
              onEdit={() => onGoToStep(2)}
            >
              {state.tenantName ? (
                <p className="text-sm leading-relaxed font-medium text-foreground">{state.tenantName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No council selected.</p>
              )}
            </ReviewSection>

            {/* 4. Details */}
            <ReviewSection
              icon={<FileText className="w-4 h-4" aria-hidden="true" />}
              label="Details"
              onEdit={() => onGoToStep(3)}
            >
              {state.title ? (
                <div className="mt-1 flex flex-col gap-2">
                  <p className="text-base leading-relaxed font-semibold wrap-break-word text-foreground">
                    {state.title}
                  </p>
                  {state.locationText && <p className="text-xs text-muted-foreground">{state.locationText}</p>}
                  <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-muted-foreground">
                    {state.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No details entered.</p>
              )}
            </ReviewSection>

            {/* 5. Category */}
            <ReviewSection icon={<CategoryIcon size={16} />} label="Category" onEdit={() => onGoToStep(4)}>
              {state.categoryName ? (
                <p className="text-sm font-medium text-foreground">{state.categoryName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No category selected.</p>
              )}
            </ReviewSection>
          </div>
        </div>
      </div>
      {/* end scrollable content */}

      {/* Bottom navigation — matches all other steps */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onBack} disabled={submitting} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (duplicateCandidates.length > 0 && !duplicateDismissed)}
          className="btn-primary min-w-28"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Submitting…
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>
    </div>
  );
}

// —— Shared ReviewSection sub-component ——
interface ReviewSectionProps {
  icon: React.ReactNode;
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function ReviewSection({ icon, label, onEdit, children }: ReviewSectionProps) {
  return (
    <div className="px-5 py-4 sm:px-6 sm:py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-accent transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
