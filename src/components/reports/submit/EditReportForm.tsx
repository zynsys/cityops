'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, MapPin, Search, AlertCircle } from 'lucide-react';
import SubmitReportMapLoader from './SubmitReportMapLoader';
import PhotoDropZone from './PhotoDropZone';
import type { CategorySummary } from '@/db/queries/categories';

interface ExistingAttachment {
  id: string;
  storagePath: string;
  fileName: string;
}

interface FlyToPos {
  lat: number;
  lng: number;
  zoom: number;
}

export interface EditReportFormProps {
  reportId: number;
  initialTitle: string;
  initialDescription: string;
  initialCategoryId: string;
  initialLocationText: string;
  initialLat: number;
  initialLng: number;
  existingAttachments: ExistingAttachment[];
  categories: CategorySummary[];
}

const MAX_DESC = 2000;

export default function EditReportForm({
  reportId,
  initialTitle,
  initialDescription,
  initialCategoryId,
  initialLocationText,
  initialLat,
  initialLng,
  existingAttachments,
  categories,
}: EditReportFormProps) {
  const router = useRouter();

  // Field state
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [locationText, setLocationText] = useState(initialLocationText);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);

  // Photo state
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFileUrls, setNewFileUrls] = useState<string[]>([]);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);

  // Location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flyToPos, setFlyToPos] = useState<FlyToPos | null>(null);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manage object URLs for new file previews
  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setNewFileUrls(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [newFiles]);

  const visibleExisting = existingAttachments.filter((a) => !removeAttachmentIds.includes(a.id));
  const totalPhotos = visibleExisting.length + newFiles.length;

  function handleRemoveExisting(id: string) {
    setRemoveAttachmentIds((prev) => [...prev, id]);
  }

  function handleRemoveNew(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const handleNewFiles = useCallback(
    (files: File[]) => {
      setNewFiles((prev) => {
        const combined = [...prev, ...files];
        return combined.slice(0, 5 - visibleExisting.length);
      });
      setPhotoErrors([]);
    },
    [visibleExisting.length],
  );

  const handlePinChange = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  async function handleLocationSearch() {
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=gb`,
        { headers: { 'User-Agent': 'CityOps/1.0 (cityops.app)' } },
      );
      if (!res.ok) throw new Error('Nominatim error');
      const data = (await res.json()) as { lat: string; lon: string; display_name?: string }[];
      if (!data.length) {
        setSearchError('No location found — try a different address or drop the pin manually.');
        return;
      }
      const newLat = parseFloat(data[0].lat);
      const newLng = parseFloat(data[0].lon);
      setFlyToPos({ lat: newLat, lng: newLng, zoom: 16 });
      setLat(newLat);
      setLng(newLng);
      if (data[0].display_name) {
        setLocationText(data[0].display_name.slice(0, 499));
      }
    } catch {
      setSearchError('Search failed — try again or drop the pin manually.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 10) {
      setError('Title must be at least 10 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        categoryId,
        title: title.trim(),
        description: description.trim(),
        locationText: locationText.trim() || undefined,
        lat,
        lng,
        removeAttachmentIds,
      }),
    );
    for (const file of newFiles) {
      formData.append('attachments[]', file);
    }

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 409) {
          setError('This report can no longer be edited because it is already being processed.');
        } else if (res.status === 403) {
          setError('You do not have permission to edit this report.');
        } else {
          setError(json.error ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      router.push(`/reports/${reportId}`);
    } catch {
      setError('A network error occurred. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      {/* Error alert */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-3 sm:p-4">
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

      <section className="flex flex-col gap-5" aria-labelledby="edit-details-heading">
        <div>
          <h2 id="edit-details-heading" className="text-base font-semibold text-foreground">
            Report details
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Describe the issue clearly and choose the most relevant category.
          </p>
        </div>
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-title" className="field-label mb-0">
            Title{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            required
            className="input-field"
            placeholder="Brief description of the problem"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-description" className="field-label mb-0">
            Description
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESC}
            rows={5}
            aria-describedby="edit-description-counter"
            className="input-field min-h-36 resize-y leading-relaxed"
            placeholder="Provide more detail about the problem…"
          />
          <p
            id="edit-description-counter"
            className="self-end text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {description.length}/{MAX_DESC}
          </p>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-category" className="field-label mb-0">
            Category{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <select
            id="edit-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="input-field"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Location */}
      <section className="flex flex-col gap-4 border-t border-border pt-6" aria-labelledby="edit-location-heading">
        <h2 id="edit-location-heading" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
          Location
        </h2>

        {/* Nominatim search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLocationSearch();
              }
            }}
            placeholder="Search address or postcode…"
            aria-label="Search address or postcode"
            className="input-field min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={handleLocationSearch}
            disabled={searching || !searchQuery.trim()}
            className="btn-secondary shrink-0 px-3 sm:px-4"
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Search
          </button>
        </div>
        {searchError && (
          <p className="text-sm leading-relaxed text-danger" role="alert">
            {searchError}
          </p>
        )}

        {/* Map */}
        <div className="isolate h-64 w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-80">
          <SubmitReportMapLoader onPinChange={handlePinChange} pinLat={lat} pinLng={lng} flyToPos={flyToPos} />
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        {/* Location text label */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-location-text" className="field-label mb-0">
            Location label (optional)
          </label>
          <input
            id="edit-location-text"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            maxLength={499}
            placeholder="e.g. Corner of High St and Church Lane"
            className="input-field"
          />
        </div>
      </section>

      {/* Photos */}
      <section className="flex flex-col gap-4 border-t border-border pt-6" aria-labelledby="edit-photos-heading">
        <h2 id="edit-photos-heading" className="text-base font-semibold text-foreground">
          Photos <span className="text-xs font-normal text-muted-foreground">({totalPhotos}/5)</span>
        </h2>

        {/* Existing photos */}
        {visibleExisting.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {visibleExisting.map((att) => (
              <div
                key={att.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={att.storagePath} alt={att.fileName} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 truncate border-t border-border bg-surface/95 px-3 py-2 text-xs text-foreground">
                  {att.fileName}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${att.fileName}`}
                  onClick={() => handleRemoveExisting(att.id)}
                  className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface/95 text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New file previews */}
        {newFiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {newFiles.map((file, i) => {
              const url = newFileUrls[i];
              if (!url) return null;
              return (
                <div
                  key={`${file.name}-${file.size}`}
                  className="relative aspect-square overflow-hidden rounded-xl border border-accent/50 bg-muted shadow-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={file.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 truncate border-t border-border bg-surface/95 px-3 py-2 text-xs text-foreground">
                    {file.name}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => handleRemoveNew(i)}
                    className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface/95 text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo validation errors */}
        {photoErrors.length > 0 && (
          <ul
            className="flex flex-col gap-2 rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
            role="alert"
          >
            {photoErrors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}

        {totalPhotos < 5 && (
          <PhotoDropZone
            currentCount={totalPhotos}
            onFilesAccepted={handleNewFiles}
            onValidationError={setPhotoErrors}
          />
        )}
        {totalPhotos >= 5 && (
          <p className="text-xs leading-relaxed text-muted-foreground">Maximum of 5 photos reached.</p>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
        <a href={`/reports/${reportId}`} className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
