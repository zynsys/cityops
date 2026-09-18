'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { reportStatusConfig } from '@/lib/reportStatusConfig';
import type { FunnelStage } from '@/db/queries/analytics';

const STATUS_KEY_MAP: Record<string, string> = {
  Created: 'created',
  Validated: 'validated',
  Assigned: 'assigned',
  'In Progress': 'in_progress',
  Resolved: 'resolved',
  Closed: 'closed',
};

function getBarColor(stage: string): string {
  const key = STATUS_KEY_MAP[stage];
  return key ? (reportStatusConfig[key]?.color ?? '#6B7280') : '#6B7280';
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

interface ResolutionFunnelProps {
  data: FunnelStage[];
}

export default function ResolutionFunnel({ data }: ResolutionFunnelProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const maxCount = data.length > 0 ? data[0].count : 0;

  if (total === 0) {
    return (
      <div className="surface-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Resolution funnel</h2>
        <p className="mt-1 text-sm text-muted-foreground">Report progression through lifecycle stages</p>
        <div className="empty-state mt-6 bg-muted/20 py-12">
          <p className="text-sm text-muted-foreground">No funnel data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Resolution funnel</h2>
      <p className="mt-1 text-sm text-muted-foreground">Report progression through lifecycle stages</p>

      {/* Desktop: horizontal funnel */}
      <div className="mt-6 hidden overflow-x-auto pb-2 md:block">
        <div className="flex min-w-[760px] items-center gap-2">
          {data.map((stage, i) => {
            const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const conversionPct =
              i > 0 && data[i - 1].count > 0 ? Math.round((stage.count / data[i - 1].count) * 100) : null;
            const isLowConversion = conversionPct !== null && conversionPct < 50;

            return (
              <div key={stage.stage} className="flex items-center" style={{ flex: 1 }}>
                {/* Drop-off indicator */}
                {i > 0 && (
                  <div className="flex shrink-0 flex-col items-center px-2">
                    <ChevronRight className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
                    <span
                      className={`text-xs font-medium tabular-nums ${isLowConversion ? 'text-warning' : 'text-muted-foreground'}`}
                    >
                      {conversionPct}%
                    </span>
                  </div>
                )}

                {/* Bar */}
                <div className="relative flex-1">
                  <p className="mb-2 text-xs font-medium text-foreground">{stage.stage}</p>
                  <div
                    className="rounded-lg border border-border px-3 py-4 text-center transition-all"
                    style={{
                      width: `${Math.max(widthPct, 12)}%`,
                      backgroundColor: `color-mix(in srgb, ${getBarColor(stage.stage)} 16%, var(--color-surface))`,
                      clipPath:
                        i < data.length - 1
                          ? 'polygon(0 0, 100% 5%, 100% 95%, 0 100%)'
                          : 'polygon(0 0, 100% 5%, 100% 95%, 0 100%)',
                      minWidth: '60px',
                    }}
                  >
                    <span className="block text-lg font-semibold text-foreground tabular-nums">
                      {formatCount(stage.count)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical funnel */}
      <div className="mt-6 flex flex-col gap-2 md:hidden">
        {data.map((stage, i) => {
          const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const conversionPct =
            i > 0 && data[i - 1].count > 0 ? Math.round((stage.count / data[i - 1].count) * 100) : null;
          const isLowConversion = conversionPct !== null && conversionPct < 50;

          return (
            <div key={stage.stage}>
              {/* Drop-off indicator */}
              {i > 0 && (
                <div className="flex items-center justify-center gap-1 py-1.5">
                  <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
                  <span
                    className={`text-xs font-medium tabular-nums ${isLowConversion ? 'text-warning' : 'text-muted-foreground'}`}
                  >
                    {conversionPct}%
                  </span>
                </div>
              )}

              {/* Bar */}
              <div
                className="mx-auto rounded-lg border border-border px-3 py-3 text-center transition-all"
                style={{
                  width: `${Math.max(widthPct, 20)}%`,
                  backgroundColor: `color-mix(in srgb, ${getBarColor(stage.stage)} 16%, var(--color-surface))`,
                  clipPath:
                    i < data.length - 1
                      ? 'polygon(0 0, 100% 0, 97% 100%, 3% 100%)'
                      : 'polygon(0 0, 100% 0, 97% 100%, 3% 100%)',
                  minWidth: '120px',
                }}
              >
                <span className="text-xs font-medium text-foreground">{stage.stage}</span>
                <span className="ml-2 text-sm font-semibold text-foreground tabular-nums">
                  {formatCount(stage.count)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
