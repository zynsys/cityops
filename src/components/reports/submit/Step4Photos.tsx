'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useReportSubmission } from './ReportSubmissionContext';
import PhotoDropZone from './PhotoDropZone';
import PhotoThumbnail from './PhotoThumbnail';

interface Step4PhotosProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step4Photos({ onBack, onNext }: Step4PhotosProps) {
  const { state, dispatch } = useReportSubmission();

  // Local copy so we can manage object URLs independently of context
  const [files, setFiles] = useState<File[]>(state.attachments);
  const [errors, setErrors] = useState<string[]>([]);

  // Object URLs keyed by "name-size", derived from the file list and revoked on
  // change/unmount so blob URLs are never leaked.
  const objectUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const file of files) {
      map.set(`${file.name}-${file.size}`, URL.createObjectURL(file));
    }
    return map;
  }, [files]);

  useEffect(() => {
    return () => {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    };
  }, [objectUrls]);

  function getUrl(file: File): string {
    return objectUrls.get(`${file.name}-${file.size}`) ?? '';
  }

  function handleFilesAccepted(incoming: File[]) {
    setFiles((prev) => {
      // Deduplicate by name + size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = incoming.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...unique];
    });
    setErrors([]);
  }

  function handleRemove(index: number) {
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
          <header>
            <p className="eyebrow mb-2">Step 4 · Photos</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Add photos of the issue
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Photos give council staff useful visual context.
            </p>
          </header>
          <PhotoDropZone
            currentCount={files.length}
            onFilesAccepted={handleFilesAccepted}
            onValidationError={(msgs) => setErrors(msgs)}
          />

          {/* Inline validation errors */}
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

          {/* Thumbnail grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {files.map((file, i) => (
                <PhotoThumbnail
                  key={`${file.name}-${file.size}`}
                  file={file}
                  objectUrl={getUrl(file)}
                  onRemove={() => handleRemove(i)}
                />
              ))}
            </div>
          )}

          {/* Optional hint */}
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Photos are optional — you can still submit without them.
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        <button type="button" onClick={handleNext} className="btn-primary min-w-24">
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
