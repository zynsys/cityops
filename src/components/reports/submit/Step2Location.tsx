"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Loader2 } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import SubmitReportMapLoader from "./SubmitReportMapLoader";
import CouncilDetectionChip, { type DetectionStatus } from "./CouncilDetectionChip";
import CouncilSelect, { type TenantOption } from "./CouncilSelect";

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
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flyToPos, setFlyToPos] = useState<FlyToPos | null>(null);

  const canProceed = state.lat !== null && state.lng !== null && state.tenantId !== null;

  const detectCouncil = useCallback(async (lat: number, lng: number) => {
    setDetectionStatus("loading");
    dispatch({ type: "CLEAR_TENANT" });
    setShowManualSelect(false);

    try {
      const res = await fetch("/api/detect-council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      if (!res.ok) throw new Error("API error");

      const data = (await res.json()) as
        | { matched: true; tenant: { id: string; name: string; slug: string } }
        | { matched: false; tenant: null };

      if (data.matched) {
        dispatch({ type: "SET_TENANT", tenantId: data.tenant.id, tenantName: data.tenant.name });
        setDetectionStatus("matched");
      } else {
        setDetectionStatus("unmatched");
        setShowManualSelect(true);
      }
    } catch {
      setDetectionStatus("error");
      setShowManualSelect(true);
    }
  }, [dispatch]);

  const handlePinChange = useCallback(
    (lat: number, lng: number) => {
      dispatch({ type: "SET_LOCATION", lat, lng });
      detectCouncil(lat, lng);
    },
    [dispatch, detectCouncil]
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
        { headers: { "User-Agent": "CityOps/1.0 (cityops.app)" } }
      );

      if (!res.ok) throw new Error("Nominatim error");

      const data = (await res.json()) as { lat: string; lon: string }[];

      if (!data.length) {
        setSearchError("No location found — try a different address or drop a pin manually.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setFlyToPos({ lat, lng, zoom: 16 });
      handlePinChange(lat, lng);
    } catch {
      setSearchError("Search failed — try again or drop a pin manually.");
    } finally {
      setSearching(false);
    }
  }

  function handleEditCouncil() {
    setShowManualSelect(true);
    setDetectionStatus("unmatched");
    dispatch({ type: "CLEAR_TENANT" });
  }

  function handleManualSelect(tenant: TenantOption) {
    dispatch({ type: "SET_TENANT", tenantId: tenant.id, tenantName: tenant.name });
    setDetectionStatus("matched");
    setShowManualSelect(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Location search bar */}
      <div className="shrink-0 px-3 py-2 border-b border-border bg-surface">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            placeholder="Search by address, street or postcode…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            aria-label="Search location"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Search"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </form>
        {searchError && (
          <p className="mt-1.5 text-xs text-amber-500" role="alert">{searchError}</p>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <SubmitReportMapLoader
          pinLat={state.lat}
          pinLng={state.lng}
          onPinChange={handlePinChange}
          flyToPos={flyToPos}
        />
        {state.lat === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="rounded-full border border-border bg-surface/90 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground shadow">
              Search an address above or click to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Council detection — sits above the nav bar */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-2 flex flex-col gap-2">
        <CouncilDetectionChip
          status={detectionStatus}
          councilName={state.tenantName ?? undefined}
          onEdit={detectionStatus === "matched" ? handleEditCouncil : undefined}
        />
        {showManualSelect && (
          <CouncilSelect
            tenants={tenants}
            selectedId={state.tenantId}
            onSelect={handleManualSelect}
          />
        )}
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
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
            canProceed
              ? "bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
