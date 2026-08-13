"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

const MAX_FILES = 5;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface PhotoDropZoneProps {
  currentCount: number;
  onFilesAccepted: (files: File[]) => void;
  onValidationError: (messages: string[]) => void;
}

export default function PhotoDropZone({
  currentCount,
  onFilesAccepted,
  onValidationError,
}: PhotoDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const atLimit = currentCount >= MAX_FILES;

  function processFiles(raw: FileList | File[]) {
    const files = Array.from(raw);
    const errors: string[] = [];
    const accepted: File[] = [];
    const remaining = MAX_FILES - currentCount;

    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        errors.push(`"${file.name}" is not a supported image type.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`"${file.name}" exceeds the 10 MB limit.`);
        continue;
      }
      accepted.push(file);
    }

    // Respect remaining capacity (truncate silently — limit message shown separately)
    const toAdd = accepted.slice(0, remaining);
    if (accepted.length > remaining) {
      errors.push(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added (maximum ${MAX_FILES}).`);
    }

    if (errors.length > 0) onValidationError(errors);
    if (toAdd.length > 0) onFilesAccepted(toAdd);

    // Reset input so the same file can be re-selected after removal
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!atLimit) setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (atLimit) return;
    processFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!atLimit) inputRef.current?.click();
    }
  }

  return (
    <div
      role="button"
      tabIndex={atLimit ? -1 : 0}
      aria-label="Upload photos — click or drag and drop"
      aria-disabled={atLimit}
      onClick={() => !atLimit && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-5 text-center transition-colors cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        atLimit
          ? "border-border bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
          : isDragging
            ? "border-accent bg-accent/10 text-foreground"
            : "border-border bg-surface hover:border-accent/60 hover:bg-accent/5 text-muted-foreground",
      ].join(" ")}
    >
      <ImagePlus
        size={32}
        className={atLimit ? "text-muted-foreground" : "text-accent"}
      />

      {atLimit ? (
        <p className="text-sm font-medium">Maximum of 5 photos reached</p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Drag &amp; drop photos here, or{" "}
            <span className="text-accent underline">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP or HEIC · Max 10 MB per photo · Up to 5 photos
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
