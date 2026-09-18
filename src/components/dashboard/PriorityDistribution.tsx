'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';

interface PriorityDistributionItem {
  priority: string;
  count: number;
}

interface PriorityDistributionProps {
  data: PriorityDistributionItem[];
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'var(--color-danger)' },
  high: { label: 'High', color: '#A97757' },
  medium: { label: 'Medium', color: '#AA925D' },
  low: { label: 'Low', color: 'var(--color-success)' },
  unset: { label: 'Unset', color: '#7E8C9D' },
};

function getConfig(priority: string) {
  return PRIORITY_CONFIG[priority] ?? { label: priority, color: '#7E8C9D' };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { priority: string; count: number } }[];
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const cfg = getConfig(entry.priority);
  const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-raised">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: cfg.color }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {entry.count} reports ({pct}%)
      </p>
    </div>
  );
}

export default function PriorityDistribution({ data }: PriorityDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const highCritical = data
    .filter((d) => d.priority === 'high' || d.priority === 'critical')
    .reduce((sum, d) => sum + d.count, 0);
  const highCriticalPct = total > 0 ? Math.round((highCritical / total) * 100) : 0;

  const chartData = data.map((d) => ({
    ...d,
    label: getConfig(d.priority).label,
  }));

  return (
    <div className="surface-card h-full p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Priority breakdown</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Understand the urgency of reported issues</p>

      {total === 0 ? (
        <div className="empty-state flex h-[250px] items-center justify-center bg-muted/20">
          <p className="text-sm text-muted-foreground">No priority data available.</p>
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
                    <Cell key={entry.priority} fill={getConfig(entry.priority).color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <p
            className={`mt-5 border-t border-border pt-4 text-xs tabular-nums ${highCriticalPct > 50 ? 'text-warning' : 'text-muted-foreground'}`}
          >
            {highCriticalPct}% of reports are high or critical priority
          </p>
        </>
      )}
    </div>
  );
}
