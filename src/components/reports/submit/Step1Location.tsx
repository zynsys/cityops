'use client';

import { useCallback, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReportSubmission } from './ReportSubmissionContext';
import SubmitReportMapLoader from './SubmitReportMapLoader';
import CouncilDetectionChip, { type DetectionStatus } from './CouncilDetectionChip';
import CouncilSelect, { type TenantOption } from './CouncilSelect';

interface Step1LocationProps {
  tenants: TenantOption[];
  onNext: () => void;
}

export default function Step1Location({ tenants, onNext }: Step1LocationProps) {
  const { state, dispatch } = useReportSubmission();
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const [showManualSelect, setShowManualSelect] = useState(false);

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
          dispatch({
            type: 'SET_TENANT',
            tenantId: data.tenant.id,
            tenantName: data.tenant.name,
          });
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 px-4 pt-5 sm:px-6">
        <p className="eyebrow mb-2">Step 1 · Location</p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Choose a location</h2>
      </header>
      {/* Map — flex fill */}
      <div className="relative isolate mx-4 my-4 min-h-64 flex-1 overflow-hidden rounded-2xl border border-border bg-muted shadow-xs sm:mx-6">
        <SubmitReportMapLoader pinLat={state.lat} pinLng={state.lng} onPinChange={handlePinChange} />

        {/* Hint overlay when no pin placed yet */}
        {state.lat === null && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center">
            <div className="max-w-sm rounded-xl border border-border bg-surface/95 px-4 py-3 text-center text-xs leading-relaxed text-foreground shadow-soft">
              Click anywhere on the map to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CouncilDetectionChip
            status={detectionStatus}
            councilName={state.tenantName ?? undefined}
            onEdit={detectionStatus === 'matched' ? handleEditCouncil : undefined}
          />

          {showManualSelect && (
            <CouncilSelect tenants={tenants} selectedId={state.tenantId} onSelect={handleManualSelect} />
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            'btn-primary min-w-24 shrink-0',
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
