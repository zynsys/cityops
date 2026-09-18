'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, Loader2 } from 'lucide-react';
import { useReportSubmission } from './ReportSubmissionContext';
import SubmitReportMapLoader from './SubmitReportMapLoader';
import CouncilDetectionChip, { type DetectionStatus } from './CouncilDetectionChip';
import CouncilSelect, { type TenantOption } from './CouncilSelect';

interface FlyToPos {
  lat: number;
  lng: number;
  zoom: number;
}

interface Step2LocationProps {
  tenants: TenantOption[];
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Location({ tenants, onBack, onNext }: Step2LocationProps) {
  const { state, dispatch } = useReportSubmission();
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flyToPos, setFlyToPos] = useState<FlyToPos | null>(null);

  const canProceed = state.lat !== null && state.lng !== null && state.tenantId !== null;

  const detectCouncil = useCallback(
    async (lat: number, lng: number) => {
      setDetectionStatus('loading');
      dispatch({ type: 'CLEAR_TENANT' });
      setShowManualSelect(false);

      try {
        const res = await fetch('/api/detect-council', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });

        if (!res.ok) throw new Error('API error');

        const data = (await res.json()) as
          | { matched: true; tenant: { id: string; name: string; slug: string } }
          | { matched: false; tenant: null };

        if (data.matched) {
          dispatch({ type: 'SET_TENANT', tenantId: data.tenant.id, tenantName: data.tenant.name });
          setDetectionStatus('matched');
        } else {
          setDetectionStatus('unmatched');
          setShowManualSelect(true);
        }
      } catch {
        setDetectionStatus('error');
        setShowManualSelect(true);
      }
    },
    [dispatch],
  );

  const handlePinChange = useCallback(
    (lat: number, lng: number) => {
      dispatch({ type: 'SET_LOCATION', lat, lng });
      detectCouncil(lat, lng);
    },
    [dispatch, detectCouncil],
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
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

      const data = (await res.json()) as { lat: string; lon: string }[];

      if (!data.length) {
        setSearchError('No location found — try a different address or drop a pin manually.');
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setFlyToPos({ lat, lng, zoom: 16 });
      handlePinChange(lat, lng);
    } catch {
      setSearchError('Search failed — try again or drop a pin manually.');
    } finally {
      setSearching(false);
    }
  }

  function handleEditCouncil() {
    setShowManualSelect(true);
    setDetectionStatus('unmatched');
    dispatch({ type: 'CLEAR_TENANT' });
  }

  function handleManualSelect(tenant: TenantOption) {
    dispatch({ type: 'SET_TENANT', tenantId: tenant.id, tenantName: tenant.name });
    setDetectionStatus('matched');
    setShowManualSelect(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4">
          <header className="shrink-0">
            <p className="eyebrow mb-2">Step 2 · Location</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Pinpoint the location</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Find the address, then place or drag the pin to the exact spot.
            </p>
          </header>
          {/* Location search bar */}
          <div className="surface-card shrink-0 p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError(null);
                }}
                placeholder="Search by address, street or postcode…"
                className="input-field min-w-0 flex-1"
                aria-label="Search location"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="btn-secondary shrink-0 px-3 sm:px-4"
                aria-label="Search"
              >
                {searching ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Search size={16} aria-hidden="true" />
                )}
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
            {searchError && (
              <p className="mt-3 text-sm leading-relaxed text-warning" role="alert">
                {searchError}
              </p>
            )}
          </div>

          {/* Map */}
          <div className="relative isolate min-h-72 flex-1 overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
            <div className="absolute inset-0">
              <SubmitReportMapLoader
                pinLat={state.lat}
                pinLng={state.lng}
                onPinChange={handlePinChange}
                flyToPos={flyToPos}
              />
            </div>
            {state.lat === null && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center">
                <div className="max-w-sm rounded-xl border border-border bg-surface/95 px-4 py-3 text-center text-xs leading-relaxed text-foreground shadow-soft">
                  Search an address above or click to drop a pin
                </div>
              </div>
            )}
          </div>

          {/* Council detection — sits above the nav bar */}
          <div className="flex shrink-0 flex-col gap-3">
            <CouncilDetectionChip
              status={detectionStatus}
              councilName={state.tenantName ?? undefined}
              onEdit={detectionStatus === 'matched' ? handleEditCouncil : undefined}
            />
            {showManualSelect && (
              <CouncilSelect tenants={tenants} selectedId={state.tenantId} onSelect={handleManualSelect} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            'btn-primary min-w-24',
            canProceed ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground shadow-none',
          ].join(' ')}
        >
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
