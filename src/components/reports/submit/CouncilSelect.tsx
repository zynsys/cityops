'use client';

import { useState, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

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

export default function CouncilSelect({ tenants, selectedId, onSelect }: CouncilSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tenants.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  const selected = tenants.find((t) => t.id === selectedId) ?? null;

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(tenant: TenantOption) {
    onSelect(tenant);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="relative w-full max-w-md">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="btn-secondary w-full justify-between px-4 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'min-w-0 text-foreground' : 'min-w-0 text-muted-foreground'}>
          {selected ? selected.name : 'Select your council…'}
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-raised">
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-1 focus-within:ring-2 focus-within:ring-accent focus-within:ring-inset">
              <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search councils…"
                aria-label="Search councils"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Options */}
            <ul role="listbox" className="max-h-52 overflow-y-auto p-1.5" aria-label="Council options">
              {filtered.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No councils found</li>}
              {filtered.map((tenant) => (
                <li
                  key={tenant.id}
                  role="option"
                  aria-selected={tenant.id === selectedId}
                  onClick={() => handleSelect(tenant)}
                  className={[
                    'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted',
                    tenant.id === selectedId ? 'bg-muted font-medium text-accent' : 'text-foreground',
                  ].join(' ')}
                >
                  {tenant.name}
                  {tenant.id === selectedId && <Check size={16} className="text-accent shrink-0" aria-hidden="true" />}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
