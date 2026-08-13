"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin } from "lucide-react";
import type { TenantOption, TimeRange } from "@/db/queries/analytics";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
  { value: "all", label: "All time" },
];

interface DashboardFilterBarProps {
  tenants: TenantOption[];
}

export default function DashboardFilterBar({
  tenants,
}: DashboardFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRange = (searchParams.get("range") as TimeRange) || "7d";
  const activeCouncil = searchParams.get("council") || "";
  const activePostcode = searchParams.get("postcode") || "";

  const [councilQuery, setCouncilQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState(activePostcode);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTenant = tenants.find((t) => t.slug === activeCouncil);

  const filteredTenants = councilQuery
    ? tenants.filter((t) =>
        t.name.toLowerCase().includes(councilQuery.toLowerCase())
      )
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
    [searchParams, router, pathname]
  );

  const handleRangeChange = (range: TimeRange) => {
    updateParams({ range: range === "7d" ? null : range });
  };

  const handleCouncilSelect = (tenant: TenantOption) => {
    updateParams({ council: tenant.slug, postcode: null });
    setCouncilQuery("");
    setPostcodeInput("");
    setIsOpen(false);
  };

  const handleCouncilClear = () => {
    updateParams({ council: null });
    setCouncilQuery("");
    setIsOpen(false);
  };

  const handlePostcodeSubmit = () => {
    const trimmed = postcodeInput.trim();
    updateParams({ postcode: trimmed || null, council: null });
    if (trimmed) setCouncilQuery("");
  };

  const handlePostcodeClear = () => {
    setPostcodeInput("");
    updateParams({ postcode: null });
  };

  useEffect(() => {
    setPostcodeInput(activePostcode);
  }, [activePostcode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
      {/* Council Filter */}
      {tenants.length > 0 && (
        <div className="relative sm:col-span-1 lg:col-span-3" ref={dropdownRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={selectedTenant ? selectedTenant.name : "All councils"}
              value={councilQuery}
              onChange={(e) => {
                setCouncilQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className={`w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                selectedTenant ? "placeholder:text-foreground" : ""
              }`}
            />
            {selectedTenant && !councilQuery && (
              <button
                onClick={handleCouncilClear}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear council filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isOpen && filteredTenants.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
              {filteredTenants.map((tenant) => (
                <li key={tenant.id}>
                  <button
                    onClick={() => handleCouncilSelect(tenant)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors cursor-pointer hover:bg-muted ${
                      tenant.slug === activeCouncil
                        ? "text-accent font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {tenant.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isOpen && councilQuery && filteredTenants.length === 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-lg">
              No councils found
            </div>
          )}
        </div>
      )}

      {/* Postcode Filter */}
      <div className="relative sm:col-span-1 lg:col-span-3">
        <div className="relative flex items-center">
          <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by postcode / city"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePostcodeSubmit();
            }}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {postcodeInput && (
            <button
              onClick={handlePostcodeClear}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear postcode filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Time-Range Selector */}
      <div className="sm:col-span-2 lg:col-span-6 flex lg:justify-end">
        <div className="flex rounded-lg border border-border bg-surface p-1 overflow-x-auto">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRangeChange(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeRange === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
