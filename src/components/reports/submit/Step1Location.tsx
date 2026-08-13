"use client";

import { useCallback, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import SubmitReportMapLoader from "./SubmitReportMapLoader";
import CouncilDetectionChip, { type DetectionStatus } from "./CouncilDetectionChip";
import CouncilSelect, { type TenantOption } from "./CouncilSelect";

interface Step1LocationProps {
  tenants: TenantOption[];
  onNext: () => void;
}

export default function Step1Location({ tenants, onNext }: Step1LocationProps) {
  const { state, dispatch } = useReportSubmission();
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");
  const [showManualSelect, setShowManualSelect] = useState(false);

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
        dispatch({
          type: "SET_TENANT",
          tenantId: data.tenant.id,
          tenantName: data.tenant.name,
        });
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
      {/* Map — flex fill */}
      <div className="flex-1 relative">
        <SubmitReportMapLoader
          pinLat={state.lat}
          pinLng={state.lng}
          onPinChange={handlePinChange}
        />

        {/* Hint overlay when no pin placed yet */}
        {state.lat === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="rounded-full border border-border bg-surface/90 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground shadow">
              Click anywhere on the map to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
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

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors shrink-0",
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
