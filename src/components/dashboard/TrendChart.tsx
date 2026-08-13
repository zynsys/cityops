"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
type TimeRange = "7d" | "30d" | "90d" | "12m" | "all";
type Grouping = "daily" | "weekly" | "monthly";

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
    case "7d":
    case "30d":
      return "daily";
    case "90d":
      return "weekly";
    case "12m":
    case "all":
      return "monthly";
  }
}

interface TrendChartProps {
  data: TrendDataSets;
  range: TimeRange;
}

const GROUPING_OPTIONS: { value: Grouping; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function formatTickLabel(iso: string, grouping: Grouping): string {
  const d = new Date(iso);
  switch (grouping) {
    case "daily":
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "weekly":
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "monthly":
      return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  }
}

function formatTooltipLabel(iso: string, grouping: Grouping): string {
  const d = new Date(iso);
  switch (grouping) {
    case "daily":
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    case "weekly": {
      const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
      const start = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      const endStr = end.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${start} – ${endStr}`;
    }
    case "monthly":
      return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
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
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-foreground">
        {formatTooltipLabel(label, grouping)}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
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
  const maxTicks = typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 10;

  return (
    <div className="h-full rounded-lg border border-border bg-surface p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Report Trends</h2>

        {/* Grouping toggle */}
        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
          {GROUPING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGrouping(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                grouping === opt.value
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center sm:h-[350px]">
          <p className="text-sm text-muted-foreground">
            No report data for the selected period.
          </p>
        </div>
      ) : (
        <div className="h-[250px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillReported" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8993F" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#E8993F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatTickLabel(v, grouping)}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                interval={Math.max(0, Math.ceil(chartData.length / maxTicks) - 1)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<CustomTooltip grouping={grouping} />}
                cursor={{ stroke: "var(--color-border)", strokeDasharray: "4 4" }}
              />

              <Area
                type="monotone"
                dataKey="reported"
                name="Reported"
                stroke="#E8993F"
                strokeWidth={2}
                fill="url(#fillReported)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#fillResolved)"
              />

              <Legend
                verticalAlign="bottom"
                height={30}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
