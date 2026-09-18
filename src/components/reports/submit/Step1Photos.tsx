'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, AlertCircle, Camera } from 'lucide-react';
import Link from 'next/link';
import { useReportSubmission } from './ReportSubmissionContext';
import PhotoDropZone from './PhotoDropZone';
import PhotoThumbnail from './PhotoThumbnail';

interface Step1PhotosProps {
  onNext: () => void;
}

export default function Step1Photos({ onNext }: Step1PhotosProps) {
  const { state, dispatch } = useReportSubmission();
  const [files, setFiles] = useState<File[]>(state.attachments);
  const [errors, setErrors] = useState<string[]>([]);
  const [quickPhotoLabel, setQuickPhotoLabel] = useState<string | null>(null);

  // Object URLs keyed by "name-size", derived from the file list and revoked on
  // change/unmount so blob URLs are never leaked.
  const previewUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const file of files) {
      map.set(`${file.name}-${file.size}`, URL.createObjectURL(file));
    }
    return map;
  }, [files]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.values()) URL.revokeObjectURL(url);
    };
  }, [previewUrls]);

  function getUrl(file: File): string {
    return previewUrls.get(`${file.name}-${file.size}`) ?? '';
  }

  // Pre-populate from sessionStorage (Quick Photo card on home page)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('cityops:quickPhoto');
      if (!stored) return;
      sessionStorage.removeItem('cityops:quickPhoto');
      const parsed = JSON.parse(stored) as { name: string; type: string; dataUrl: string };
      const byteString = atob(parsed.dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], parsed.name, { type: parsed.type });
      // One-time hydration from sessionStorage on mount (Quick Photo hand-off).
      /* eslint-disable react-hooks/set-state-in-effect */
      setFiles([file]);
      setQuickPhotoLabel(parsed.name);
      /* eslint-enable react-hooks/set-state-in-effect */
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
    dispatch({ type: 'SET_ATTACHMENTS', attachments: files });
    onNext();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="surface-card mx-auto flex w-full max-w-2xl flex-col gap-6 p-5 sm:p-6">
          {/* Intro copy */}
          <div>
            <p className="eyebrow mb-2">Step 1 · Photos</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Add photos of the issue
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Start by adding a photo of the issue. This gives council staff immediate visual context.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              No photo? That&apos;s fine — you can still submit a report.
            </p>
          </div>

          <PhotoDropZone
            currentCount={files.length}
            onFilesAccepted={handleFilesAccepted}
            onValidationError={(msgs) => setErrors(msgs)}
          />

          {errors.length > 0 && (
            <ul className="flex flex-col gap-2 rounded-xl border border-danger/25 bg-danger/5 p-4" role="alert">
              {errors.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {msg}
                </li>
              ))}
            </ul>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-3">
              {quickPhotoLabel && (
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <Camera size={16} aria-hidden="true" />
                  Photo added from Quick Report
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
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

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Photos are optional — you can still submit without them.
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="btn-secondary">
          Cancel
        </Link>
        <button type="button" onClick={handleNext} className="btn-primary min-w-24">
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
