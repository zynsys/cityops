import { auth } from "@auth";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";
import { SignInLink } from "./SignInLink";
import RefreshLink from "./RefreshLink";

// Visible to everyone (incl. unauthenticated)
const PUBLIC_NAV_LINKS = [
  { href: "/reports/new", label: "New Report" },
  { href: "/reports", label: "Reports" },
  { href: "/analytics", label: "Analytics" },
  { href: "/map", label: "Map" },
];

// Visible only to non-staff (unauthenticated or citizen)
const CITIZEN_NAV_LINKS: { href: string; label: string }[] = [];

// authority_user + tenant_admin only — council-level staff
const COUNCIL_STAFF_ROLES = new Set(["authority_user", "tenant_admin"]);
// all authenticated staff roles (for citizen link suppression)
const ALL_STAFF_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

// Council Reports queue — authority_user and tenant_admin only
const COUNCIL_STAFF_NAV_LINKS = [
  { href: "/staff/reports", label: "Council Reports" },
];

// Management links — tenant_admin only (scoped to their council)
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

export async function Header() {
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email ?? null;
  const avatarUrl = session?.user?.image ?? null;
  const isAuthenticated = !!session;
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";

  const navLinks = getNavLinks(userRole);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="CityOps" width={28} height={28} />
          <span className="text-xl font-bold text-foreground">CityOps</span>
        </Link>

        <div className="flex items-center gap-6">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 md:flex">
            {navLinks.map((link) =>
              link.href === "/reports/new" ? (
                <RefreshLink
                  key={link.href}
                  href={link.href}
                  className="text-sm text-foreground link-hover"
                >
                  {link.label}
                </RefreshLink>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-foreground link-hover"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {isAuthenticated ? (
            <div className="hidden md:flex">
              <UserMenu
                displayName={displayName ?? "Account"}
                avatarUrl={avatarUrl}
                userRole={userRole}
              />
            </div>
          ) : (
            <SignInLink className="hidden text-sm text-foreground link-hover md:block" />
          )}

          <ThemeToggle />

          {/* Mobile nav (self-contained trigger + drawer) */}
          <MobileNav
            isAuthenticated={isAuthenticated}
            displayName={displayName}
            userRole={userRole}
          />
        </div>
      </div>
    </header>
  );
}
