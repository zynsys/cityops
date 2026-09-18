import { auth } from '@auth';
import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { MobileNav } from './MobileNav';
import { SignInLink } from './SignInLink';
import { NavLink } from './NavLink';

// Visible to everyone (incl. unauthenticated)
const PUBLIC_NAV_LINKS = [
  { href: '/reports/new', label: 'New Report' },
  { href: '/reports', label: 'Reports' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/map', label: 'Map' },
];

// Visible only to non-staff (unauthenticated or citizen)
const CITIZEN_NAV_LINKS: { href: string; label: string }[] = [];

// authority_user + tenant_admin only — council-level staff
const COUNCIL_STAFF_ROLES = new Set(['authority_user', 'tenant_admin']);
// all authenticated staff roles (for citizen link suppression)
const ALL_STAFF_ROLES = new Set(['authority_user', 'tenant_admin', 'platform_admin']);

// Council Reports queue — authority_user and tenant_admin only
const COUNCIL_STAFF_NAV_LINKS = [{ href: '/staff/reports', label: 'Council Reports' }];

// Management links — tenant_admin only (scoped to their council)
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

export async function Header() {
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email ?? null;
  const avatarUrl = session?.user?.image ?? null;
  const isAuthenticated = !!session;
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? '';

  const navLinks = getNavLinks(userRole);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl">
          <BrandMark />
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">CityOps</span>
        </Link>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2 xl:gap-3">
          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden items-center gap-0.5 xl:flex">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <div className="hidden border-l border-border pl-3 xl:flex">
              <UserMenu displayName={displayName ?? 'Account'} avatarUrl={avatarUrl} userRole={userRole} />
            </div>
          ) : (
            <SignInLink className="hidden min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-muted xl:inline-flex" />
          )}

          <ThemeToggle />

          {/* Mobile nav (self-contained trigger + drawer) */}
          <MobileNav isAuthenticated={isAuthenticated} displayName={displayName} userRole={userRole} />
        </div>
      </div>
    </header>
  );
}
