"use client";

import { useState, useRef } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface CouncilSelectProps {
  tenants: TenantOption[];
  selectedId: string | null;
  onSelect: (tenant: TenantOption) => void;
}

export default function CouncilSelect({
  tenants,
  selectedId,
  onSelect,
}: CouncilSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  const selected = tenants.find((t) => t.id === selectedId) ?? null;

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(tenant: TenantOption) {
    onSelect(tenant);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm hover:bg-muted transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select your council…"}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[240px] rounded-lg border border-border bg-surface shadow-lg">
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search councils…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {/* Options */}
            <ul
              role="listbox"
              className="max-h-52 overflow-y-auto py-1"
              aria-label="Council options"
            >
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No councils found
                </li>
              )}
              {filtered.map((tenant) => (
                <li
                  key={tenant.id}
                  role="option"
                  aria-selected={tenant.id === selectedId}
                  onClick={() => handleSelect(tenant)}
                  className={[
                    "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted",
                    tenant.id === selectedId ? "text-accent" : "text-foreground",
                  ].join(" ")}
                >
                  {tenant.name}
                  {tenant.id === selectedId && (
                    <Check size={14} className="text-accent shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
