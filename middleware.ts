import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

/**
 * Routes that are always accessible without a session.
 * Evaluated as prefix matches (startsWith) unless marked as exact.
 */
const PUBLIC_PREFIXES = [
  '/map',
  '/reports/',
  '/api/auth/',
  '/api/detect-council',
  '/api/health',
  '/sign-in',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/accept-invite',
  '/403',
];

/** Exact public paths (checked separately to avoid prefix collision). */
const PUBLIC_EXACT = new Set(['/']);

/** Paths that require authentication even if they match a public prefix. */
const AUTH_REQUIRED_EXACT = new Set(['/reports/new']);

/**
 * Role-restricted route prefixes and their required roles.
 * Checked in order — first match wins.
 */
const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/platform/', roles: ['platform_admin'] },
  { prefix: '/admin/', roles: ['tenant_admin', 'platform_admin'] },
  { prefix: '/staff/', roles: ['authority_user', 'tenant_admin'] },
];

function isPublic(pathname: string): boolean {
  if (AUTH_REQUIRED_EXACT.has(pathname)) return false;
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Always allow public routes through
  if (isPublic(pathname)) {
    // Redirect already-authenticated users away from auth pages
    if (
      session &&
      (pathname.startsWith('/sign-in') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password'))
    ) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated — redirect to /sign-in with callbackUrl
  if (!session) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-restricted routes — check against JWT role
  const userRole = (session.user as { role?: string }).role ?? '';
  for (const rule of ROLE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      if (!rule.roles.includes(userRole)) {
        return NextResponse.redirect(new URL('/403', req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (favicon)
     * - public images/files (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot|css|js|map)).*)',
  ],
};
