'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { getStatusConfig } from '@/lib/reportStatusConfig';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface StatusDistributionItem {
  status: string;
  count: number;
}

interface StatusDistributionProps {
  data: StatusDistributionItem[];
}

const CLOSED_STATUSES = new Set(['resolved', 'closed', 'invalid']);

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { status: string; count: number } }[];
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-raised">
      <StatusBadge status={entry.status} />
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {entry.count} reports ({pct}%)
      </p>
    </div>
  );
}

export default function StatusDistribution({ data }: StatusDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const openCount = data.filter((d) => !CLOSED_STATUSES.has(d.status)).reduce((sum, d) => sum + d.count, 0);
  const closedCount = data
    .filter((d) => d.status === 'resolved' || d.status === 'closed')
    .reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((d) => ({
    ...d,
    label: getStatusConfig(d.status).label,
  }));

  return (
    <div className="surface-card h-full p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Status distribution</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Where reports are in their lifecycle</p>

      {total === 0 ? (
        <div className="empty-state flex h-[250px] items-center justify-center bg-muted/20">
          <p className="text-sm text-muted-foreground">No status data available.</p>
        </div>
      ) : (
        <>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip total={total} />}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.15 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: 'var(--color-foreground)' }} />
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={getStatusConfig(entry.status).color}
                      style={{ filter: 'saturate(0.55)' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            Open <span className="font-semibold text-foreground tabular-nums">{openCount}</span>
            <span className="mx-2">·</span>
            Closed <span className="font-semibold text-foreground tabular-nums">{closedCount}</span>
          </p>
        </>
      )}
    </div>
  );
}
