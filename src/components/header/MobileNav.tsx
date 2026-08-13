"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut, ClipboardList, Star } from "lucide-react";
import Link from "next/link";
import { SignInLink } from "./SignInLink";
import RefreshLink from "./RefreshLink";

const PUBLIC_NAV_LINKS = [
  { href: "/reports/new", label: "New Report" },
  { href: "/reports", label: "Reports" },
  { href: "/analytics", label: "Analytics" },
  { href: "/map", label: "Map" },
];

const CITIZEN_NAV_LINKS: { href: string; label: string }[] = [];

const COUNCIL_STAFF_ROLES = new Set(["authority_user", "tenant_admin"]);
const ALL_STAFF_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const COUNCIL_STAFF_NAV_LINKS = [
  { href: "/staff/reports", label: "Council Reports" },
];

const TENANT_ADMIN_NAV_LINKS = [
  { href: "/staff/categories", label: "Categories" },
  { href: "/staff/users", label: "Users" },
];

function getNavLinks(userRole: string) {
  // platform_admin has no nav links yet — their /platform/* section is future
  if (userRole === "platform_admin") return [];

  const isAnyStaff = ALL_STAFF_ROLES.has(userRole);
  const isCouncilStaff = COUNCIL_STAFF_ROLES.has(userRole);
  const isTenantAdmin = userRole === "tenant_admin";
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

export function MobileNav({ isAuthenticated, displayName, userRole = "" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/" });
  }

  const navLinks = getNavLinks(userRole);

  return (
    <>
      {/* Hamburger trigger */}
      <button
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between p-4">
              {displayName && (
                <span className="text-sm font-medium text-foreground">
                  {displayName}
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ml-auto rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-4">
              {navLinks.map((link) =>
                link.href === "/reports/new" ? (
                  <RefreshLink
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </RefreshLink>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Citizen-only account links */}
            {userRole === "citizen" && (
              <div className="border-t border-border px-4 py-3 flex flex-col gap-1">
                <Link
                  href="/my-reports"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  My Reports
                </Link>
                <Link
                  href="/my-rewards"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  My Rewards
                </Link>
              </div>
            )}

            <div className="mt-auto p-4">
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              ) : (
                <SignInLink
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
