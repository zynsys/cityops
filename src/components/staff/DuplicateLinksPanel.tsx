'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Link2, Search, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DuplicateLink {
  id: string;
  createdAt: Date;
  otherReport: { id: number; title: string };
}

interface SearchResult {
  id: number;
  title: string;
  status: string;
}

interface DuplicateLinksPanelProps {
  reportId: number;
  initialLinks: DuplicateLink[];
}

function shortId(id: number): string {
  return String(id);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DuplicateLinksPanel({ reportId, initialLinks }: DuplicateLinksPanelProps) {
  const router = useRouter();
  const [links, setLinks] = useState<DuplicateLink[]>(initialLinks);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/staff/reports/search?q=${encodeURIComponent(q)}&excludeId=${reportId}`);
          if (res.ok) {
            const data = (await res.json()) as SearchResult[];
            setResults(data);
            setShowDropdown(data.length > 0);
          }
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [reportId],
  );

  useEffect(() => {
    search(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setSelected(result);
    setQuery(result.title);
    setShowDropdown(false);
  };

  const handleAddLink = async () => {
    if (!selected || isLinking) return;
    setIsLinking(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetReportId: selected.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to link report');
        return;
      }

      const data = (await res.json()) as {
        link: { id: string; targetReport: { id: number; title: string } };
      };

      setLinks((prev) => [
        ...prev,
        {
          id: data.link.id,
          createdAt: new Date(),
          otherReport: data.link.targetReport,
        },
      ]);
      setQuery('');
      setSelected(null);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    setRemovingId(linkId);
    setError(null);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/duplicates/${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to remove link');
        return;
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <details className="surface-card group p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Link2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        Linked duplicates ({links.length})
        <ChevronRight
          className="ml-auto h-4.5 w-4.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-3 space-y-3 border-t border-border pt-4">
        {/* Existing links */}
        {links.length === 0 ? (
          <p className="rounded-xl bg-muted/30 px-4 py-4 text-sm text-muted-foreground">No duplicates linked.</p>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  #{shortId(link.otherReport.id)} — {link.otherReport.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(link.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLink(link.id)}
                disabled={removingId === link.id}
                aria-label={`Remove duplicate link to ${link.otherReport.title}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                {removingId === link.id ? (
                  <span
                    className="block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent"
                    aria-hidden="true"
                  />
                ) : (
                  <X className="h-4.5 w-4.5" aria-hidden="true" />
                )}
              </button>
            </div>
          ))
        )}

        {/* Search input */}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected && e.target.value !== selected.title) setSelected(null);
              }}
              placeholder="Find report to link…"
              aria-label="Search for report to link as duplicate"
              className="input-field w-full pl-11 pr-11"
            />
            {isSearching && (
              <span
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border border-t-accent"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <ul
              role="listbox"
              aria-label="Search results"
              className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-raised"
            >
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected?.id === r.id}
                    onClick={() => handleSelectResult(r)}
                    className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  >
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{shortId(r.id)}</span>
                    <span className="min-w-0 truncate text-foreground">{r.title}</span>
                    <StatusBadge status={r.status} className="col-span-2 justify-self-start" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm add chip */}
        {selected && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center">
            <p className="min-w-0 break-words text-sm text-foreground">
              Link to: <strong>#{shortId(selected.id)}</strong> — {selected.title}
            </p>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={isLinking}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {isLinking ? 'Adding…' : 'Add link'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p
            className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
