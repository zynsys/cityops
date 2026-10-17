import { fireEvent, render, screen } from '@testing-library/react';
import * as navigation from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNavLinkActive, NavLink } from '@/components/header/NavLink';

afterEach(() => vi.restoreAllMocks());

describe('navigation route matching', () => {
  it.each([
    ['/reports', '/reports', true],
    ['/reports/', '/reports', true],
    ['/reports/42', '/reports', true],
    ['/reports/new', '/reports', false],
    ['/reports/new/', '/reports', false],
    ['/reports/new/review', '/reports', false],
    ['/reports/new', '/reports/new', true],
    ['/reports/new/review', '/reports/new', true],
    ['/analytics', '/reports/new', false],
    ['/reports', '/reports/new', false],
    ['/analytics', '/analytics', true],
    ['/staff/reports/42', '/staff/reports', true],
    ['/my-reports', '/reports', false],
    ['/reports-archive', '/reports', false],
    ['/', '/reports/new', false],
  ])('%s matches %s: %s', (pathname, href, active) => {
    expect(isNavLinkActive(pathname, href)).toBe(active);
  });
});

function TestNavigation() {
  return (
    <nav>
      <NavLink href="/reports/new">New Report</NavLink>
      <NavLink href="/reports">Reports</NavLink>
      <NavLink href="/analytics">Analytics</NavLink>
    </nav>
  );
}

describe('NavLink', () => {
  it('moves the sole active state from Reports to Analytics after navigation', () => {
    const pathname = vi.spyOn(navigation, 'usePathname').mockReturnValue('/reports');
    const { container, rerender } = render(<TestNavigation />);

    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveClass('bg-brand', 'text-brand-foreground');
    expect(screen.getByRole('link', { name: 'New Report' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'New Report' })).not.toHaveClass('bg-brand');
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);

    pathname.mockReturnValue('/analytics');
    rerender(<TestNavigation />);

    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveClass('bg-brand', 'text-brand-foreground');
    expect(screen.getByRole('link', { name: 'Reports' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Reports' })).not.toHaveClass('bg-brand');
    expect(screen.getByRole('link', { name: 'New Report' })).not.toHaveClass('bg-brand');
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('highlights only New Report inside the wizard', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/reports/new');
    const { container } = render(<TestNavigation />);
    expect(screen.getByRole('link', { name: 'New Report' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'New Report' })).toHaveClass('bg-brand', 'text-brand-foreground');
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('retains same-route refresh and mobile dismissal for New Report', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/reports/new');
    const push = vi.fn();
    const refresh = vi.fn();
    const onNavigate = vi.fn();
    vi.spyOn(navigation, 'useRouter').mockReturnValue({
      push,
      refresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);

    render(
      <NavLink href="/reports/new" onNavigate={onNavigate}>
        New Report
      </NavLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'New Report' }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/reports/new');
    expect(refresh).toHaveBeenCalledOnce();
  });
});
