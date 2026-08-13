"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { DashboardKPIs } from "@/db/queries/analytics";
import type { TimeRange } from "@/db/queries/analytics";

interface KpiCardsProps {
  data: DashboardKPIs;
  range: TimeRange;
}

function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    prevTarget.current = target;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

function formatDuration(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return `${Math.round(days * 24)} hrs`;
  return `${days} days`;
}

interface TrendBadgeProps {
  value: number | null;
  invertColor?: boolean;
}

function TrendBadge({ value, invertColor = false }: TrendBadgeProps) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  let colorClass = "text-muted-foreground";
  if (!isNeutral) {
    const isGood = invertColor ? isNegative : isPositive;
    colorClass = isGood ? "text-green-500" : "text-red-500";
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(value)}%
    </span>
  );
}

interface KpiCardConfig {
  label: string;
  value: number;
  format?: "number" | "duration";
  rawValue?: number | null;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend: number | null;
  invertTrend?: boolean;
  showTrend: boolean;
}

export default function KpiCards({ data, range }: KpiCardsProps) {
  const showTrends = range !== "all";

  const cards: KpiCardConfig[] = [
    {
      label: "Reports Submitted",
      value: data.reportsSubmitted,
      icon: FileText,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      trend: data.trends.reportsSubmitted,
      showTrend: showTrends,
    },
    {
      label: "Reports Resolved",
      value: data.reportsResolved,
      icon: CheckCircle2,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
      trend: data.trends.reportsResolved,
      showTrend: showTrends,
    },
    {
      label: "Avg. Resolution Time",
      value: data.avgResolutionDays ?? 0,
      format: "duration",
      rawValue: data.avgResolutionDays,
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      trend: data.trends.avgResolutionDays,
      invertTrend: true,
      showTrend: showTrends,
    },
    {
      label: "Active Reports",
      value: data.activeReports,
      icon: AlertCircle,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      trend: null,
      showTrend: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  format = "number",
  rawValue,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  invertTrend = false,
  showTrend,
}: KpiCardConfig) {
  const animatedValue = useCountUp(value);

  const displayValue =
    format === "duration"
      ? formatDuration(rawValue ?? null)
      : animatedValue.toLocaleString();

  return (
    <div className="relative rounded-xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
      <div className={`absolute top-4 right-4 rounded-full p-2 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>

      <div className="pr-12">
        <p className="text-3xl font-bold text-foreground">{displayValue}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>

      {showTrend && (
        <div className="mt-3">
          <TrendBadge value={trend} invertColor={invertTrend} />
          {trend !== null && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              vs prior period
            </span>
          )}
        </div>
      )}
    </div>
  );
}
