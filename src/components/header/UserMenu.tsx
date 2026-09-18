'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Award, ChevronDown, ClipboardList, LogOut, UserRound } from 'lucide-react';

interface UserMenuProps {
  displayName: string;
  avatarUrl?: string | null;
  userRole?: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-foreground">
      {initials}
    </span>
  );
}

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function UserMenu({ displayName, avatarUrl, userRole = '' }: UserMenuProps) {
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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ callbackUrl: '/' });
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'account-menu' : undefined}
        className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-8 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <Initials name={displayName} />
        )}
        <span className="max-w-24 truncate 2xl:max-w-32">{displayName}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id="account-menu"
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-2xl border border-border bg-surface p-1.5 shadow-raised"
        >
          {userRole && (
            <>
              <div className="px-3 py-3">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <span className="mt-1.5 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
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
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
          >
            <UserRound className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            Profile
          </Link>
          {userRole === 'citizen' && (
            <>
              <Link
                href="/my-reports"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                <ClipboardList className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                My Reports
              </Link>
              <Link
                href="/my-rewards"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                <Award className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                My Rewards
              </Link>
            </>
          )}
          <div className="my-1 border-t border-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={loading}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
            {loading ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
