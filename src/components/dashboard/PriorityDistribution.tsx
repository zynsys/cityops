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

interface PriorityDistributionItem {
  priority: string;
  count: number;
}

interface PriorityDistributionProps {
  data: PriorityDistributionItem[];
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#EF4444" },
  high: { label: "High", color: "#F97316" },
  medium: { label: "Medium", color: "#EAB308" },
  low: { label: "Low", color: "#22C55E" },
  unset: { label: "Unset", color: "#94A3B8" },
};

function getConfig(priority: string) {
  return PRIORITY_CONFIG[priority] ?? { label: priority, color: "#94A3B8" };
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

export default function PriorityDistribution({ data }: PriorityDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const highCritical = data
    .filter((d) => d.priority === "high" || d.priority === "critical")
    .reduce((sum, d) => sum + d.count, 0);
  const highCriticalPct = total > 0 ? Math.round((highCritical / total) * 100) : 0;

  const chartData = data.map((d) => ({
    ...d,
    label: getConfig(d.priority).label,
  }));

  return (
    <div className="h-full rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        Priority Breakdown
      </h2>

      {total === 0 ? (
        <div className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No priority data available.
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
                      key={entry.priority}
                      fill={getConfig(entry.priority).color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <p className={`mt-3 text-xs ${highCriticalPct > 50 ? "text-orange-500" : "text-muted-foreground"}`}>
            {highCriticalPct}% of reports are high or critical priority
          </p>
        </>
      )}
    </div>
  );
}
