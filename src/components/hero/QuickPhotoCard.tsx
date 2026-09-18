'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload } from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export default function QuickPhotoCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Please upload a JPG, PNG, WebP or HEIC image.';
    if (file.size > MAX_SIZE_BYTES) return 'Photo must be under 10 MB.';
    return null;
  }

  function processFile(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(
          'cityops:quickPhoto',
          JSON.stringify({ name: file.name, type: file.type, dataUrl: reader.result as string }),
        );
      } catch {
        // sessionStorage unavailable — navigate without pre-population
      }
      router.push('/reports/new');
    };
    reader.readAsDataURL(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="surface-card flex min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <Camera className="size-5 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-base font-semibold tracking-tight text-foreground">Quick Photo Report</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Start a report with a photo of the issue.</p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a photo to start a report"
        onChange={handleChange}
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a photo or click to upload"
        aria-describedby={error ? 'quick-photo-hint quick-photo-error' : 'quick-photo-hint'}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          'mt-4 flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          dragOver ? 'border-accent bg-muted' : 'border-border bg-background hover:border-accent/60 hover:bg-muted',
        ].join(' ')}
      >
        <Upload className="size-5 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Drop a photo or click to upload</p>
        <p id="quick-photo-hint" className="text-xs leading-relaxed text-muted-foreground">
          JPG, PNG, WebP or HEIC · Up to 10 MB
        </p>
      </div>

      {error && (
        <p id="quick-photo-error" className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
