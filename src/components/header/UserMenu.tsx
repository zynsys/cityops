"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, ClipboardList, LogOut, Star, UserCircle } from "lucide-react";

interface UserMenuProps {
  displayName: string;
  avatarUrl?: string | null;
  userRole?: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0].slice(0, 2);
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-foreground">
      {initials}
    </span>
  );
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function UserMenu({ displayName, avatarUrl, userRole = "" }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <Initials name={displayName} />
        )}
        <span className="hidden max-w-[140px] truncate lg:block">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {userRole && (
            <>
              <div className="px-4 py-2">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <span className="mt-0.5 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  {formatRole(userRole)}
                </span>
              </div>
              <div className="my-1 border-t border-border" role="separator" />
            </>
          )}
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
          >
            <UserCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Profile
          </Link>
          {userRole === "citizen" && (
            <>
              <Link
                href="/my-reports"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                My Reports
              </Link>
              <Link
                href="/my-rewards"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                My Rewards
              </Link>
            </>
          )}
          <div className="my-1 border-t border-border" role="separator" />
          <button
            role="menuitem"
            onClick={handleSignOut}
            disabled={loading}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {loading ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}
