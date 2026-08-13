"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, X, MapPin, Building2, Tag, FileText, ImageIcon, Pencil } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import ReviewMiniMap from "./ReviewMiniMap";
import SubmissionSuccess from "./SubmissionSuccess";
import DuplicateWarning, { type SimilarReportCandidate } from "./DuplicateWarning";

const DRAFT_KEY = "cityops:wizard:draft";

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
    if (
      state.lat === null ||
      state.lng === null ||
      !state.categoryId ||
      !state.title
    ) {
      return;
    }

    const params = new URLSearchParams({
      lat: String(state.lat),
      lng: String(state.lng),
      categoryId: state.categoryId,
      title: state.title,
    });
    if (state.tenantId) params.set("tenantId", state.tenantId);

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
      type: "SET_ATTACHMENTS",
      attachments: state.attachments.filter((_, i) => i !== index),
    });
  }

  async function handleSubmit() {
    if (
      state.lat === null ||
      state.lng === null ||
      !state.tenantId ||
      !state.categoryId
    ) {
      setError("Some required information is missing. Please go back and complete all steps.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        tenantId: state.tenantId,
        categoryId: state.categoryId,
        title: state.title,
        description: state.description,
        locationText: state.locationText || undefined,
        lat: state.lat,
        lng: state.lng,
      })
    );
    for (const file of state.attachments) {
      formData.append("attachments[]", file);
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
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
              }))
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
              })
            );
          } catch {
            // If serialization fails (e.g. quota exceeded), redirect anyway without draft
          }
          router.push("/sign-in?callbackUrl=/reports/new");
          return;
        }
        const message =
          res.status === 400
            ? "Some information is invalid. Please review your submission."
            : "Something went wrong. Please try again.";
        setError(message);
        return;
      }

      setSubmittedReport(json.report as SubmittedReport);
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReportAnother() {
    window.location.href = "/reports/new";
  }

  // —— Success screen ——
  if (submittedReport) {
    return (
      <SubmissionSuccess
        reportId={submittedReport.id}
        reportTitle={submittedReport.title}
        councilName={state.tenantName ?? "your council"}
        onReportAnother={handleReportAnother}
      />
    );
  }

  // —— Review card ——
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">

      <div>
        <h2 className="text-xl font-bold text-foreground">Review your report</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Check everything looks correct before submitting.
        </p>
      </div>

      {/* Duplicate warning */}
      {duplicateCandidates.length > 0 && !duplicateDismissed && (
        <DuplicateWarning
          candidates={duplicateCandidates}
          onDismiss={() => setDuplicateDismissed(true)}
        />
      )}

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3"
        >
          <span className="flex-1 text-sm text-red-700 dark:text-red-400">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Review sections */}
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
        {/* 1. Photos */}
        <ReviewSection
          icon={<ImageIcon className="w-4 h-4" />}
          label="Photos"
          onEdit={() => onGoToStep(1)}
        >
          {state.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {state.attachments.map((file, i) => {
                const url = previewUrls[i];
                if (!url) return null;
                return (
                  <div key={`${file.name}-${file.size}`} className="relative w-16 h-16 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={file.name}
                      className="w-16 h-16 rounded-md object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      aria-label={`Remove ${file.name}`}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No photos attached.</p>
          )}
        </ReviewSection>

        {/* 2. Location */}
        <ReviewSection
          icon={<MapPin className="w-4 h-4" />}
          label="Location"
          onEdit={() => onGoToStep(2)}
        >
          {state.lat !== null && state.lng !== null ? (
            <>
              <div className="h-40 w-full rounded-md overflow-hidden mt-1">
                <ReviewMiniMap lat={state.lat} lng={state.lng} />
              </div>
              {state.locationText && (
                <p className="text-sm text-muted-foreground mt-2">{state.locationText}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {state.lat.toFixed(5)}, {state.lng.toFixed(5)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No location selected.</p>
          )}
        </ReviewSection>

        {/* 3. Council */}
        <ReviewSection
          icon={<Building2 className="w-4 h-4" />}
          label="Council"
          onEdit={() => onGoToStep(2)}
        >
          {state.tenantName ? (
            <p className="text-sm font-medium text-foreground">{state.tenantName}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No council selected.</p>
          )}
        </ReviewSection>

        {/* 4. Details */}
        <ReviewSection
          icon={<FileText className="w-4 h-4" />}
          label="Details"
          onEdit={() => onGoToStep(3)}
        >
          {state.title ? (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm font-semibold text-foreground">{state.title}</p>
              {state.locationText && (
                <p className="text-xs text-muted-foreground">{state.locationText}</p>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {state.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No details entered.</p>
          )}
        </ReviewSection>

        {/* 5. Category */}
        <ReviewSection
          icon={<Tag className="w-4 h-4" />}
          label="Category"
          onEdit={() => onGoToStep(4)}
        >
          {state.categoryName ? (
            <p className="text-sm font-medium text-foreground">{state.categoryName}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No category selected.</p>
          )}
        </ReviewSection>
      </div>
      </div>

      </div>{/* end scrollable content */}

      {/* Bottom navigation — matches all other steps */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (duplicateCandidates.length > 0 && !duplicateDismissed)}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Submitting…
            </>
          ) : (
            "Submit"
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
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded transition-opacity"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="w-3 h-3" aria-hidden="true" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
