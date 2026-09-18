'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RefreshLink from './RefreshLink';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  onNavigate?: () => void;
}

/** The new-report wizard is a separate destination from report browsing. */
export function isNavLinkActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (href === '/reports' && (path === '/reports/new' || path.startsWith('/reports/new/'))) {
    return false;
  }
  return path === href || path.startsWith(`${href}/`);
}

export function NavLink({ href, children, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const active = isNavLinkActive(pathname, href);
  const className = [
    'inline-flex min-h-11 items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
    active ? 'bg-brand text-brand-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');

  if (href === '/reports/new') {
    return (
      <RefreshLink href={href} className={className} onNavigate={onNavigate} aria-current={active ? 'page' : undefined}>
        {children}
      </RefreshLink>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
