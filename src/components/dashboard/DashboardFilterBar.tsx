'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import type { TenantOption, TimeRange } from '@/db/queries/analytics';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
];

interface DashboardFilterBarProps {
  tenants: TenantOption[];
}

export default function DashboardFilterBar({ tenants }: DashboardFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRange = (searchParams.get('range') as TimeRange) || '7d';
  const activeCouncil = searchParams.get('council') || '';
  const activePostcode = searchParams.get('postcode') || '';

  const [councilQuery, setCouncilQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState(activePostcode);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTenant = tenants.find((t) => t.slug === activeCouncil);

  const filteredTenants = councilQuery
    ? tenants.filter((t) => t.name.toLowerCase().includes(councilQuery.toLowerCase()))
    : tenants;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleRangeChange = (range: TimeRange) => {
    updateParams({ range: range === '7d' ? null : range });
  };

  const handleCouncilSelect = (tenant: TenantOption) => {
    updateParams({ council: tenant.slug, postcode: null });
    setCouncilQuery('');
    setPostcodeInput('');
    setIsOpen(false);
  };

  const handleCouncilClear = () => {
    updateParams({ council: null });
    setCouncilQuery('');
    setIsOpen(false);
  };

  const handlePostcodeSubmit = () => {
    const trimmed = postcodeInput.trim();
    updateParams({ postcode: trimmed || null, council: null });
    if (trimmed) setCouncilQuery('');
  };

  const handlePostcodeClear = () => {
    setPostcodeInput('');
    updateParams({ postcode: null });
  };

  useEffect(() => {
    setPostcodeInput(activePostcode);
  }, [activePostcode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="surface-card grid grid-cols-1 items-start gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-12">
      {/* Council Filter */}
      {tenants.length > 0 && (
        <div className="relative min-w-0 sm:col-span-1 lg:col-span-3" ref={dropdownRef}>
          <label htmlFor="analytics-council" className="field-label">
            Council
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4.5 w-4.5 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="analytics-council"
              type="text"
              placeholder={selectedTenant ? selectedTenant.name : 'All councils'}
              value={councilQuery}
              onChange={(e) => {
                setCouncilQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className={`input-field w-full pl-11 pr-12 ${selectedTenant ? 'placeholder:text-foreground' : ''}`}
            />
            {selectedTenant && !councilQuery && (
              <button
                onClick={handleCouncilClear}
                className="absolute right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Clear council filter"
              >
                <X className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {isOpen && filteredTenants.length > 0 && (
            <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-raised">
              {filteredTenants.map((tenant) => (
                <li key={tenant.id}>
                  <button
                    onClick={() => handleCouncilSelect(tenant)}
                    className={`min-h-11 w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                      tenant.slug === activeCouncil ? 'bg-accent/10 font-medium text-accent' : 'text-foreground'
                    }`}
                  >
                    {tenant.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isOpen && councilQuery && filteredTenants.length === 0 && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-surface px-4 py-4 text-sm text-muted-foreground shadow-raised">
              No councils found
            </div>
          )}
        </div>
      )}

      {/* Postcode Filter */}
      <div className="relative min-w-0 sm:col-span-1 lg:col-span-3">
        <label htmlFor="analytics-postcode" className="field-label">
          Postcode or city
        </label>
        <div className="relative flex items-center">
          <MapPin
            className="pointer-events-none absolute left-3.5 h-4.5 w-4.5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="analytics-postcode"
            type="text"
            placeholder="Filter by postcode / city"
            aria-describedby="analytics-postcode-hint"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePostcodeSubmit();
            }}
            className="input-field w-full pl-11 pr-12"
          />
          {postcodeInput && (
            <button
              onClick={handlePostcodeClear}
              className="absolute right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Clear postcode filter"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="analytics-postcode-hint" className="mt-2 text-xs text-muted-foreground">
          Press Enter to apply.
        </p>
      </div>

      {/* Time-Range Selector */}
      <div className="min-w-0 sm:col-span-2 lg:col-span-6">
        <span id="analytics-range-label" className="field-label">
          Date range
        </span>
        <div
          className="flex overflow-x-auto rounded-xl border border-border bg-muted/40 p-1"
          role="group"
          aria-labelledby="analytics-range-label"
        >
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRangeChange(value)}
              aria-pressed={activeRange === value}
              className={`min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                activeRange === value
                  ? 'bg-accent text-accent-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
