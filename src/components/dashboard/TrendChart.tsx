'use client';

import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
type TimeRange = '7d' | '30d' | '90d' | '12m' | 'all';
type Grouping = 'daily' | 'weekly' | 'monthly';

interface TrendDataPoint {
  date: string;
  reported: number;
  resolved: number;
}

interface TrendDataSets {
  daily: TrendDataPoint[];
  weekly: TrendDataPoint[];
  monthly: TrendDataPoint[];
}

function getDefaultGrouping(range: TimeRange): Grouping {
  switch (range) {
    case '7d':
    case '30d':
      return 'daily';
    case '90d':
      return 'weekly';
    case '12m':
    case 'all':
      return 'monthly';
  }
}

interface TrendChartProps {
  data: TrendDataSets;
  range: TimeRange;
}

const GROUPING_OPTIONS: { value: Grouping; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function formatTickLabel(iso: string, grouping: Grouping): string {
  const d = new Date(iso);
  switch (grouping) {
    case 'daily':
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    case 'weekly':
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    case 'monthly':
      return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }
}

function formatTooltipLabel(iso: string, grouping: Grouping): string {
  const d = new Date(iso);
  switch (grouping) {
    case 'daily':
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    case 'weekly': {
      const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
      const start = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      const endStr = end.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${start} – ${endStr}`;
    }
    case 'monthly':
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  grouping: Grouping;
}

function CustomTooltip({ active, payload, label, grouping }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-raised">
      <p className="mb-2 text-xs font-semibold text-foreground">{formatTooltipLabel(label, grouping)}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          {entry.name}: <span className="ml-auto font-semibold text-foreground tabular-nums">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function TrendChart({ data, range }: TrendChartProps) {
  const [grouping, setGrouping] = useState<Grouping>(getDefaultGrouping(range));

  // Reset grouping when range changes
  const [prevRange, setPrevRange] = useState(range);
  if (range !== prevRange) {
    setPrevRange(range);
    setGrouping(getDefaultGrouping(range));
  }

  const chartData: TrendDataPoint[] = data[grouping];

  // Compute max tick count to prevent label overlap
  const maxTicks = typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10;

  return (
    <div className="surface-card h-full p-5 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Report trends</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reported and resolved over time</p>
        </div>

        {/* Grouping toggle */}
        <div
          className="flex shrink-0 rounded-xl border border-border bg-muted/40 p-1"
          role="group"
          aria-label="Chart grouping"
        >
          {GROUPING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGrouping(opt.value)}
              aria-pressed={grouping === opt.value}
              className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                grouping === opt.value
                  ? 'bg-surface text-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="empty-state flex h-[250px] items-center justify-center bg-muted/20 sm:h-[350px]">
          <p className="text-sm text-muted-foreground">No report data for the selected period.</p>
        </div>
      ) : (
        <div className="h-[250px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillReported" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatTickLabel(v, grouping)}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                interval={Math.max(0, Math.ceil(chartData.length / maxTicks) - 1)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<CustomTooltip grouping={grouping} />}
                cursor={{ stroke: 'var(--color-border)', strokeDasharray: '4 4' }}
              />

              <Area
                type="monotone"
                dataKey="reported"
                name="Reported"
                stroke="var(--color-info)"
                strokeWidth={2}
                fill="url(#fillReported)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#fillResolved)"
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => <span className="ml-1 text-xs font-medium text-foreground">{value}</span>}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
