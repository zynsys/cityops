"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export default function QuickPhotoCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Please upload a JPG, PNG, WebP or HEIC image.";
    if (file.size > MAX_SIZE_BYTES) return "Photo must be under 10 MB.";
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
          "cityops:quickPhoto",
          JSON.stringify({ name: file.name, type: file.type, dataUrl: reader.result as string })
        );
      } catch {
        // sessionStorage unavailable — navigate without pre-population
      }
      router.push("/reports/new");
    };
    reader.readAsDataURL(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-700 bg-[#293342] p-8">
      <div className="mb-5 flex items-center gap-2.5">
        <Camera className="h-5 w-5 text-[#F0B100]" />
        <h2 className="text-lg font-bold text-white">Quick Photo Report</h2>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload a photo to start a report"
        onChange={handleChange}
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a photo or click to upload"
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-[#F0B100] bg-[#F0B100]/10"
            : "border-gray-600 hover:border-gray-500 hover:bg-white/5",
        ].join(" ")}
      >
        <Upload className="mb-2 h-8 w-8 text-gray-500" />
        <p className="text-sm text-gray-400">Drop a photo or click to upload</p>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG up to 10MB</p>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>
      )}
    </div>
  );
}
