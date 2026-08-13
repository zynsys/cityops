"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { locationParam } from "@/lib/utils";

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
  basePath = "/reports",
}: ReportLocationSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from whichever location param is active in the URL
  const [postcodeInput, setPostcodeInput] = useState(currentPostcode || currentCity);

  // Build a new URL preserving status, sort, category but swapping the location
  function buildUrl(locationKey: string, locationValue: string) {
    const params = new URLSearchParams();
    // Preserve filter/sort params
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort");
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    // Set new location
    if (locationValue) params.set(locationKey, locationValue);
    params.set("page", "1");
    return `${basePath}?${params.toString()}`;
  }

  function handleCouncilChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    // Clear postcode input when a council is selected
    setPostcodeInput("");
    router.push(buildUrl("council", slug));
  }

  function handlePostcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = postcodeInput.trim().slice(0, 100);
    if (!val) return;
    const { key, value } = locationParam(val);
    router.push(buildUrl(key, value));
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="space-y-2">
      {/* Council dropdown */}
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

      {/* Postcode / city text search */}
      <form onSubmit={handlePostcodeSubmit} className="relative">
        <input
          type="text"
          value={postcodeInput}
          onChange={(e) => setPostcodeInput(e.target.value)}
          placeholder="Or enter a postcode / city…"
          maxLength={100}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Search by postcode or city"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
