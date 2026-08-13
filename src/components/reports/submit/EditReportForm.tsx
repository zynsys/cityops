"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, MapPin, Search, AlertCircle } from "lucide-react";
import SubmitReportMapLoader from "./SubmitReportMapLoader";
import PhotoDropZone from "./PhotoDropZone";
import type { CategorySummary } from "@/db/queries/categories";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const visibleExisting = existingAttachments.filter(
    (a) => !removeAttachmentIds.includes(a.id)
  );
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
    [visibleExisting.length]
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
        { headers: { "User-Agent": "CityOps/1.0 (cityops.app)" } }
      );
      if (!res.ok) throw new Error("Nominatim error");
      const data = (await res.json()) as { lat: string; lon: string; display_name?: string }[];
      if (!data.length) {
        setSearchError("No location found — try a different address or drop the pin manually.");
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
      setSearchError("Search failed — try again or drop the pin manually.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 10) {
      setError("Title must be at least 10 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Description must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        categoryId,
        title: title.trim(),
        description: description.trim(),
        locationText: locationText.trim() || undefined,
        lat,
        lng,
        removeAttachmentIds,
      })
    );
    for (const file of newFiles) {
      formData.append("attachments[]", file);
    }

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 409) {
          setError("This report can no longer be edited because it is already being processed.");
        } else if (res.status === 403) {
          setError("You do not have permission to edit this report.");
        } else {
          setError(json.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      router.push(`/reports/${reportId}`);
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
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

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-title" className="text-sm font-semibold text-foreground">
          Title <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          placeholder="Brief description of the problem"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-description" className="text-sm font-semibold text-foreground">
          Description
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MAX_DESC}
          rows={5}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-y"
          placeholder="Provide more detail about the problem…"
        />
        <p className="text-xs text-muted-foreground self-end">
          {description.length}/{MAX_DESC}
        </p>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-category" className="text-sm font-semibold text-foreground">
          Category <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="edit-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          Location
        </p>

        {/* Nominatim search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLocationSearch(); } }}
            placeholder="Search address or postcode…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="button"
            onClick={handleLocationSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
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
          <p className="text-xs text-red-500 dark:text-red-400">{searchError}</p>
        )}

        {/* Map */}
        <div className="h-56 w-full rounded-lg overflow-hidden border border-border">
          <SubmitReportMapLoader
            onPinChange={handlePinChange}
            pinLat={lat}
            pinLng={lng}
            flyToPos={flyToPos}
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        {/* Location text label */}
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-location-text" className="text-xs font-medium text-muted-foreground">
            Location label (optional)
          </label>
          <input
            id="edit-location-text"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            maxLength={499}
            placeholder="e.g. Corner of High St and Church Lane"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">
          Photos <span className="text-xs font-normal text-muted-foreground">({totalPhotos}/5)</span>
        </p>

        {/* Existing photos */}
        {visibleExisting.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {visibleExisting.map((att) => (
              <div
                key={att.id}
                className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.storagePath}
                  alt={att.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1 text-white text-[10px] leading-tight truncate">
                  {att.fileName}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${att.fileName}`}
                  onClick={() => handleRemoveExisting(att.id)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New file previews */}
        {newFiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {newFiles.map((file, i) => {
              const url = newFileUrls[i];
              if (!url) return null;
              return (
                <div
                  key={`${file.name}-${file.size}`}
                  className="relative rounded-lg overflow-hidden border border-accent/50 bg-muted aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1 text-white text-[10px] leading-tight truncate">
                    {file.name}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => handleRemoveNew(i)}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo validation errors */}
        {photoErrors.length > 0 && (
          <ul className="text-xs text-red-500 dark:text-red-400 flex flex-col gap-0.5">
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
          <p className="text-xs text-muted-foreground">Maximum of 5 photos reached.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
        <a
          href={`/reports/${reportId}`}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
