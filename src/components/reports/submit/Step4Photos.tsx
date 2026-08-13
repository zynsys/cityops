"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import PhotoDropZone from "./PhotoDropZone";
import PhotoThumbnail from "./PhotoThumbnail";

interface Step4PhotosProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step4Photos({ onBack, onNext }: Step4PhotosProps) {
  const { state, dispatch } = useReportSubmission();

  // Local copy so we can manage object URLs independently of context
  const [files, setFiles] = useState<File[]>(state.attachments);
  const [errors, setErrors] = useState<string[]>([]);

  // Object URL map: file identity (name+size) → object URL
  const urlMapRef = useRef<Map<string, string>>(new Map());

  // Revoke URLs for files that have been removed from the list
  useEffect(() => {
    const map = urlMapRef.current;
    const activeKeys = new Set(files.map((f) => `${f.name}-${f.size}`));
    for (const [key, url] of map.entries()) {
      if (!activeKeys.has(key)) {
        URL.revokeObjectURL(url);
        map.delete(key);
      }
    }
  }, [files]);

  // Compute object URL synchronously so src is never empty on the first render
  function getUrl(file: File): string {
    const key = `${file.name}-${file.size}`;
    const map = urlMapRef.current;
    if (!map.has(key)) {
      map.set(key, URL.createObjectURL(file));
    }
    return map.get(key)!;
  }

  // Revoke all remaining URLs on unmount
  useEffect(() => {
    const map = urlMapRef.current;
    return () => {
      for (const url of map.values()) {
        URL.revokeObjectURL(url);
      }
      map.clear();
    };
  }, []);

  function handleFilesAccepted(incoming: File[]) {
    setFiles((prev) => {
      // Deduplicate by name + size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = incoming.filter(
        (f) => !existing.has(`${f.name}-${f.size}`)
      );
      return [...prev, ...unique];
    });
    setErrors([]);
  }

  function handleRemove(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNext() {
    dispatch({ type: "SET_ATTACHMENTS", attachments: files });
    onNext();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">
        <PhotoDropZone
          currentCount={files.length}
          onFilesAccepted={handleFilesAccepted}
          onValidationError={(msgs) => setErrors(msgs)}
        />

        {/* Inline validation errors */}
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1">
            {errors.map((msg, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-red-400"
              >
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {msg}
              </li>
            ))}
          </ul>
        )}

        {/* Thumbnail grid */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
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
        <p className="text-xs text-muted-foreground text-center">
          Photos are optional — you can still submit without them.
        </p>
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

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
