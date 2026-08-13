"use client";

import { useEffect, useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useReportSubmission } from "./ReportSubmissionContext";
import PhotoDropZone from "./PhotoDropZone";
import PhotoThumbnail from "./PhotoThumbnail";

interface Step1PhotosProps {
  onNext: () => void;
}

export default function Step1Photos({ onNext }: Step1PhotosProps) {
  const { state, dispatch } = useReportSubmission();
  const [files, setFiles] = useState<File[]>(state.attachments);
  const [errors, setErrors] = useState<string[]>([]);
  const [quickPhotoLabel, setQuickPhotoLabel] = useState<string | null>(null);
  // Stores object URLs keyed by "name-size" — recreated via useEffect so
  // React Strict Mode cleanup→recreate cycle triggers a re-render with valid URLs.
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // Build / rebuild object URLs whenever the file list changes
  useEffect(() => {
    const entries: Record<string, string> = {};
    for (const file of files) {
      entries[`${file.name}-${file.size}`] = URL.createObjectURL(file);
    }
    setPreviewUrls(entries);
    return () => {
      for (const url of Object.values(entries)) URL.revokeObjectURL(url);
    };
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps -- files identity is stable between re-renders

  function getUrl(file: File): string {
    return previewUrls[`${file.name}-${file.size}`] ?? "";
  }

  // Pre-populate from sessionStorage (Quick Photo card on home page)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("cityops:quickPhoto");
      if (!stored) return;
      sessionStorage.removeItem("cityops:quickPhoto");
      const parsed = JSON.parse(stored) as { name: string; type: string; dataUrl: string };
      const byteString = atob(parsed.dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], parsed.name, { type: parsed.type });
      setFiles([file]);
      setQuickPhotoLabel(parsed.name);
    } catch {
      // Silently ignore — sessionStorage unavailable or data malformed
    }
  }, []);

  function handleFilesAccepted(incoming: File[]) {
    setQuickPhotoLabel(null);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...incoming.filter((f) => !existing.has(`${f.name}-${f.size}`))];
    });
    setErrors([]);
  }

  function handleRemove(index: number) {
    setQuickPhotoLabel(null);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNext() {
    dispatch({ type: "SET_ATTACHMENTS", attachments: files });
    onNext();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
        {/* Intro copy */}
        <div>
          <p className="text-sm text-muted-foreground">
            Start by adding a photo of the issue. This gives council staff immediate visual context.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No photo? That&apos;s fine — you can still submit a report.
          </p>
        </div>

        <PhotoDropZone
          currentCount={files.length}
          onFilesAccepted={handleFilesAccepted}
          onValidationError={(msgs) => setErrors(msgs)}
        />

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1">
            {errors.map((msg, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {msg}
              </li>
            ))}
          </ul>
        )}

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            {quickPhotoLabel && (
              <p className="text-xs font-medium text-accent">
                📷 Photo added from Quick Report
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {files.map((file, i) => {
                const url = getUrl(file);
                if (!url) return null;
                return (
                  <PhotoThumbnail
                    key={`${file.name}-${file.size}`}
                    file={file}
                    objectUrl={url}
                    onRemove={() => handleRemove(i)}
                  />
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Photos are optional — you can still submit without them.
        </p>
      </div>
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-colors"
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
