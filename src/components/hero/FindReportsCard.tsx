'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Loader2, LocateFixed } from 'lucide-react';
import { locationParam } from '@/lib/utils';

export default function FindReportsCard() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geolocationSupported, setGeolocationSupported] = useState(false);

  useEffect(() => {
    setGeolocationSupported('geolocation' in navigator);
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
            { headers: { 'Accept-Language': 'en' } },
          );
          if (!res.ok) throw new Error('Nominatim error');
          const data = (await res.json()) as {
            address?: {
              postcode?: string;
              city?: string;
              town?: string;
              village?: string;
              county?: string;
            };
          };
          const postcode = data.address?.postcode;
          const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county;

          if (postcode) {
            router.push(`/reports?postcode=${encodeURIComponent(postcode)}`);
          } else if (city) {
            router.push(`/reports?city=${encodeURIComponent(city)}`);
          } else {
            setLocationError('Unable to determine your location.');
          }
        } catch {
          setLocationError('Unable to get your location.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError('Unable to get your location.');
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  }

  return (
    <div className="surface-card flex min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <MapPin className="size-5 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-base font-semibold tracking-tight text-foreground">Find Reports Near You</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">See what&apos;s been reported in your area.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="hero-search">
          Search by postcode or city
        </label>
        <input
          id="hero-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter postcode or city name"
          className="input-field min-w-0 flex-1"
          aria-label="Search by postcode or city"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary shrink-0 px-3.5" aria-label="Search">
          <Search className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </form>

      {locationError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {locationError}
        </p>
      )}

      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating || !geolocationSupported}
        aria-busy={locating}
        className="mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-1 text-sm font-medium text-accent transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {locating ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <LocateFixed className="size-4" strokeWidth={1.75} aria-hidden="true" />
        )}
        {locating ? 'Locating…' : 'Use my current location'}
      </button>
    </div>
  );
}
