'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { locationParam } from '@/lib/utils';

interface TenantOption {
  slug: string;
  name: string;
}

interface ReportLocationSearchProps {
  tenants: TenantOption[];
  currentCouncil: string;
  currentPostcode: string;
  currentCity: string;
  basePath?: string;
}

export default function ReportLocationSearch({
  tenants,
  currentCouncil,
  currentPostcode,
  currentCity,
  basePath = '/reports',
}: ReportLocationSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from whichever location param is active in the URL
  const [postcodeInput, setPostcodeInput] = useState(currentPostcode || currentCity);

  // Build a new URL preserving status, sort, category but swapping the location
  function buildUrl(locationKey: string, locationValue: string) {
    const params = new URLSearchParams();
    // Preserve filter/sort params
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    // Set new location
    if (locationValue) params.set(locationKey, locationValue);
    params.set('page', '1');
    return `${basePath}?${params.toString()}`;
  }

  function handleCouncilChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    // Clear postcode input when a council is selected
    setPostcodeInput('');
    router.push(buildUrl('council', slug));
  }

  function handlePostcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = postcodeInput.trim().slice(0, 100);
    if (!val) return;
    const { key, value } = locationParam(val);
    router.push(buildUrl(key, value));
  }

  const selectClass = 'input-field min-w-0 pr-8';

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Council dropdown */}
      <label className="min-w-0">
        <span className="field-label">Council</span>
        <select
          value={currentCouncil}
          onChange={handleCouncilChange}
          className={selectClass}
          aria-label="Select a council"
        >
          <option value="">All Councils</option>
          {tenants.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {/* Postcode / city text search */}
      <form onSubmit={handlePostcodeSubmit} className="relative min-w-0">
        <label className="block">
          <span className="field-label">Postcode or city</span>
          <input
            type="text"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            placeholder="Postcode or city…"
            maxLength={100}
            className="input-field pr-12"
            aria-label="Search by postcode or city"
          />
        </label>
        <button
          type="submit"
          className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          aria-label="Search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
