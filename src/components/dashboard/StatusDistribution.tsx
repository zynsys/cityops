"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { getStatusConfig } from "@/lib/reportStatusConfig";

interface StatusDistributionItem {
  status: string;
  count: number;
}

interface StatusDistributionProps {
  data: StatusDistributionItem[];
}

const CLOSED_STATUSES = new Set(["resolved", "closed", "invalid"]);

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { status: string; count: number } }[];
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const cfg = getStatusConfig(entry.status);
  const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: cfg.color }}
        />
        <span className="text-xs font-medium text-foreground">{cfg.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {entry.count} reports ({pct}%)
      </p>
    </div>
  );
}

export default function StatusDistribution({ data }: StatusDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const openCount = data
    .filter((d) => !CLOSED_STATUSES.has(d.status))
    .reduce((sum, d) => sum + d.count, 0);
  const closedCount = data
    .filter((d) => d.status === "resolved" || d.status === "closed")
    .reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((d) => ({
    ...d,
    label: getStatusConfig(d.status).label,
  }));

  return (
    <div className="h-full rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        Status Distribution
      </h2>

      {total === 0 ? (
        <div className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No status data available.
          </p>
        </div>
      ) : (
        <>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip total={total} />}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.15 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={getStatusConfig(entry.status).color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <p className="mt-3 text-xs text-muted-foreground">
            Open <span className="font-bold text-foreground">{openCount}</span>
            <span className="mx-2">·</span>
            Closed <span className="font-bold text-foreground">{closedCount}</span>
          </p>
        </>
      )}
    </div>
  );
}
