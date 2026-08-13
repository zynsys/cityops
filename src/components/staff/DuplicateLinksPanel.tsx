"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { getStatusConfig } from "@/lib/reportStatusConfig";

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
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DuplicateLinksPanel({ reportId, initialLinks }: DuplicateLinksPanelProps) {
  const router = useRouter();
  const [links, setLinks] = useState<DuplicateLink[]>(initialLinks);
  const [query, setQuery] = useState("");
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
          const res = await fetch(
            `/api/staff/reports/search?q=${encodeURIComponent(q)}&excludeId=${reportId}`
          );
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
    [reportId]
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetReportId: selected.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to link report");
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
      setQuery("");
      setSelected(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    setRemovingId(linkId);
    setError(null);

    try {
      const res = await fetch(`/api/staff/reports/${reportId}/duplicates/${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to remove link");
        return;
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors list-none">
        <svg
          className="h-3 w-3 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Linked duplicates ({links.length})
      </summary>

      <div className="mt-2 space-y-2">
        {/* Existing links */}
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No duplicates linked.</p>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  #{shortId(link.otherReport.id)} — {link.otherReport.title}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(link.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLink(link.id)}
                disabled={removingId === link.id}
                aria-label={`Remove duplicate link to ${link.otherReport.title}`}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {removingId === link.id ? (
                  <span className="block h-3 w-3 animate-spin rounded-full border border-border border-t-accent" aria-hidden="true" />
                ) : (
                  <X className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            </div>
          ))
        )}

        {/* Search input */}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected && e.target.value !== selected.title) setSelected(null);
              }}
              placeholder="Find report to link…"
              aria-label="Search for report to link as duplicate"
              className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-xs text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {isSearching && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border border-border border-t-accent" aria-hidden="true" />
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <ul
              role="listbox"
              aria-label="Search results"
              className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-md"
            >
              {results.map((r) => {
                const statusCfg = getStatusConfig(r.status);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected?.id === r.id}
                      onClick={() => handleSelectResult(r)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                    >
                      <span className="font-mono text-muted-foreground shrink-0">
                        #{shortId(r.id)}
                      </span>
                      <span className="flex-1 truncate text-foreground">{r.title}</span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
                      >
                        {statusCfg.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Confirm add chip */}
        {selected && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
            <p className="text-xs text-foreground truncate min-w-0">
              Link to: <strong>#{shortId(selected.id)}</strong> — {selected.title}
            </p>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={isLinking}
              className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isLinking ? "Adding…" : "Add link"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
