'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { Award, Menu, X, LogOut, ClipboardList, UserRound } from 'lucide-react';
import Link from 'next/link';
import { SignInLink } from './SignInLink';
import { NavLink } from './NavLink';

const PUBLIC_NAV_LINKS = [
  { href: '/reports/new', label: 'New Report' },
  { href: '/reports', label: 'Reports' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/map', label: 'Map' },
];

const CITIZEN_NAV_LINKS: { href: string; label: string }[] = [];

const COUNCIL_STAFF_ROLES = new Set(['authority_user', 'tenant_admin']);
const ALL_STAFF_ROLES = new Set(['authority_user', 'tenant_admin', 'platform_admin']);

const COUNCIL_STAFF_NAV_LINKS = [{ href: '/staff/reports', label: 'Council Reports' }];

const TENANT_ADMIN_NAV_LINKS = [
  { href: '/staff/categories', label: 'Categories' },
  { href: '/staff/users', label: 'Users' },
];

function getNavLinks(userRole: string) {
  // platform_admin has no nav links yet — their /platform/* section is future
  if (userRole === 'platform_admin') return [];

  const isAnyStaff = ALL_STAFF_ROLES.has(userRole);
  const isCouncilStaff = COUNCIL_STAFF_ROLES.has(userRole);
  const isTenantAdmin = userRole === 'tenant_admin';
  return [
    ...PUBLIC_NAV_LINKS,
    ...(!isAnyStaff ? CITIZEN_NAV_LINKS : []),
    ...(isCouncilStaff ? COUNCIL_STAFF_NAV_LINKS : []),
    ...(isTenantAdmin ? TENANT_ADMIN_NAV_LINKS : []),
  ];
}

interface MobileNavProps {
  isAuthenticated: boolean;
  displayName?: string | null;
  userRole?: string;
}

export function MobileNav({ isAuthenticated, displayName, userRole = '' }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const desktopMedia = window.matchMedia('(min-width: 80rem)');
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
      if (event.key !== 'Tab') return;

      const controls = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    desktopMedia.addEventListener('change', handleDesktopChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      desktopMedia.removeEventListener('change', handleDesktopChange);
      if (!desktopMedia.matches) trigger?.focus();
    };
  }, [isOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: '/' });
  }

  const navLinks = getNavLinks(userRole);

  return (
    <>
      {/* Hamburger trigger */}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 xl:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'mobile-navigation' : undefined}
        aria-haspopup="dialog"
      >
        <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 xl:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col border-l border-border bg-surface shadow-raised xl:hidden"
          >
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <h2 id="mobile-navigation-title" className="text-sm font-semibold text-foreground">
                  Navigation
                </h2>
                {displayName && <p className="mt-1 truncate text-xs text-muted-foreground">{displayName}</p>}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                aria-label="Close menu"
              >
                <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink key={link.href} href={link.href} onNavigate={() => setIsOpen(false)}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Profile is available to every signed-in role; report and reward links are citizen-only. */}
              {isAuthenticated && (
                <div className="mt-5 flex flex-col gap-1 border-t border-border pt-4">
                  <p className="px-3.5 pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Your account
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <UserRound className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    Profile
                  </Link>
                  {userRole === 'citizen' && (
                    <>
                      <Link
                        href="/my-reports"
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ClipboardList className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        My Reports
                      </Link>
                      <Link
                        href="/my-rewards"
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Award className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        My Rewards
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              {isAuthenticated ? (
                <button type="button" onClick={handleSignOut} disabled={signingOut} className="btn-secondary w-full">
                  <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              ) : (
                <SignInLink onClick={() => setIsOpen(false)} className="btn-primary w-full" />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
