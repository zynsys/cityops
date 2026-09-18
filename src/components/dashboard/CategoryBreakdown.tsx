'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const DEFAULT_COLOR = '#6B7280';
const MAX_CATEGORIES = 8;

interface CategoryBreakdownItem {
  slug: string;
  name: string;
  color: string | null;
  count: number;
}

interface CategoryBreakdownProps {
  data: CategoryBreakdownItem[];
}

interface ChartEntry {
  slug: string;
  name: string;
  color: string;
  count: number;
}

function prepareChartData(data: CategoryBreakdownItem[]): ChartEntry[] {
  if (data.length <= MAX_CATEGORIES) {
    return data.map((d) => ({ ...d, color: d.color ?? DEFAULT_COLOR }));
  }

  const top = data.slice(0, MAX_CATEGORIES).map((d) => ({
    ...d,
    color: d.color ?? DEFAULT_COLOR,
  }));

  const otherCount = data.slice(MAX_CATEGORIES).reduce((sum, d) => sum + d.count, 0);

  top.push({
    slug: '__other__',
    name: 'Other',
    color: DEFAULT_COLOR,
    count: otherCount,
  });

  return top;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-raised">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.color, filter: 'saturate(0.55)' }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-foreground">{entry.name}</span>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {entry.count} reports ({pct}%)
      </p>
    </div>
  );
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');

  const chartData = prepareChartData(data);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  function handleCategoryClick(slug: string) {
    if (slug === '__other__') return;
    const params = new URLSearchParams(searchParams.toString());
    if (activeCategory === slug) {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="surface-card h-full p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Categories</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">Report mix by category</p>

      {chartData.length === 0 ? (
        <div className="empty-state flex h-[250px] items-center justify-center bg-muted/20">
          <p className="text-sm text-muted-foreground">No category data available.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart */}
          <div className="relative mx-auto h-[200px] w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_, index) => handleCategoryClick(chartData[index].slug)}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.slug}
                      fill={entry.color}
                      style={{ filter: 'saturate(0.55)' }}
                      opacity={activeCategory && activeCategory !== entry.slug ? 0.4 : 1}
                      strokeWidth={activeCategory === entry.slug ? 2 : 0}
                      stroke={activeCategory === entry.slug ? 'var(--color-foreground)' : 'none'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip total={total} />} wrapperStyle={{ outline: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{total}</span>
              <span className="mt-1 text-xs text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Ranked List */}
          <ul className="mt-4 space-y-1 border-t border-border pt-4">
            {chartData.map((entry) => {
              const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0';
              const isActive = activeCategory === entry.slug;
              const isOther = entry.slug === '__other__';

              return (
                <li key={entry.slug}>
                  <button
                    onClick={() => handleCategoryClick(entry.slug)}
                    disabled={isOther}
                    aria-pressed={isActive}
                    className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'bg-accent/10 font-medium text-foreground'
                        : isOther
                          ? 'cursor-default text-muted-foreground'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color, filter: 'saturate(0.55)' }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate" title={entry.name}>
                      {entry.name}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">{entry.count}</span>
                    <span className="w-10 text-right text-muted-foreground tabular-nums">{pct}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
