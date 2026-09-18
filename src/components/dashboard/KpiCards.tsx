'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DashboardKPIs } from '@/db/queries/analytics';
import type { TimeRange } from '@/db/queries/analytics';

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
  if (days === null) return '—';
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
        <Minus className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  let colorClass = 'text-muted-foreground';
  if (!isNeutral) {
    const isGood = invertColor ? isNegative : isPositive;
    colorClass = isGood ? 'text-success' : 'text-danger';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${colorClass}`}>
      {isNeutral ? (
        <Minus className="h-4 w-4" aria-hidden="true" />
      ) : isPositive ? (
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-4 w-4" aria-hidden="true" />
      )}
      {Math.abs(value)}%
    </span>
  );
}

interface KpiCardConfig {
  label: string;
  value: number;
  format?: 'number' | 'duration';
  rawValue?: number | null;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend: number | null;
  invertTrend?: boolean;
  showTrend: boolean;
}

export default function KpiCards({ data, range }: KpiCardsProps) {
  const showTrends = range !== 'all';

  const cards: KpiCardConfig[] = [
    {
      label: 'Reports Submitted',
      value: data.reportsSubmitted,
      icon: FileText,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      trend: data.trends.reportsSubmitted,
      showTrend: showTrends,
    },
    {
      label: 'Reports Resolved',
      value: data.reportsResolved,
      icon: CheckCircle2,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      trend: data.trends.reportsResolved,
      showTrend: showTrends,
    },
    {
      label: 'Avg. Resolution Time',
      value: data.avgResolutionDays ?? 0,
      format: 'duration',
      rawValue: data.avgResolutionDays,
      icon: Clock,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      trend: data.trends.avgResolutionDays,
      invertTrend: true,
      showTrend: showTrends,
    },
    {
      label: 'Active Reports',
      value: data.activeReports,
      icon: AlertCircle,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      trend: null,
      showTrend: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  format = 'number',
  rawValue,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  invertTrend = false,
  showTrend,
}: KpiCardConfig) {
  const animatedValue = useCountUp(value);

  const displayValue = format === 'duration' ? formatDuration(rawValue ?? null) : animatedValue.toLocaleString();

  return (
    <div className="surface-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>

      <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground tabular-nums">{displayValue}</p>

      {showTrend && (
        <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <TrendBadge value={trend} invertColor={invertTrend} />
          {trend !== null && <span className="text-xs text-muted-foreground">vs prior period</span>}
        </div>
      )}
    </div>
  );
}
