"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2 } from "lucide-react";
import { locationParam } from "@/lib/utils";

export default function FindReportsCard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geolocationSupported, setGeolocationSupported] = useState(false);

  useEffect(() => {
    setGeolocationSupported("geolocation" in navigator);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setLocationError(null);
    const { key, value } = locationParam(trimmed);
    router.push(`/reports?${key}=${encodeURIComponent(value)}`);
  }

  function handleUseLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!res.ok) throw new Error("Nominatim error");
          const data = await res.json() as {
            address?: {
              postcode?: string;
              city?: string;
              town?: string;
              village?: string;
              county?: string;
            };
          };
          const postcode = data.address?.postcode;
          const city =
            data.address?.city ??
            data.address?.town ??
            data.address?.village ??
            data.address?.county;

          if (postcode) {
            router.push(`/reports?postcode=${encodeURIComponent(postcode)}`);
          } else if (city) {
            router.push(`/reports?city=${encodeURIComponent(city)}`);
          } else {
            setLocationError("Unable to determine your location.");
          }
        } catch {
          setLocationError("Unable to get your location.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError("Unable to get your location.");
        setLocating(false);
      },
      { timeout: 10_000 }
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-700 bg-[#293342] p-8">
      <div className="mb-5 flex items-center gap-2.5">
        <MapPin className="h-5 w-5 text-[#F0B100]" />
        <h2 className="text-lg font-bold text-white">Find Reports Near You</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label className="sr-only" htmlFor="hero-search">
          Search by postcode or city
        </label>
        <input
          id="hero-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter postcode or city name"
          className="flex-1 rounded-lg border border-gray-600 bg-[#131B29] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0B100]/50"
          aria-label="Search by postcode or city"
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-lg bg-[#F0B100] px-4 py-2.5 text-sm font-medium text-black hover:bg-[#F0B100]/90 transition-colors"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {locationError && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {locationError}
        </p>
      )}

      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating || !geolocationSupported}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#F0B100] underline underline-offset-2 hover:text-[#F0B100]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
      >
        {locating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Locating…" />
        ) : (
          <MapPin className="h-3.5 w-3.5" />
        )}
        {locating ? "Locating…" : "Use my current location"}
      </button>
    </div>
  );
}
