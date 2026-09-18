import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryIcon, getCategoryTone } from '@/components/ui/CategoryIcon';

describe('CategoryIcon', () => {
  it.each([
    'road-pavement',
    'parks-green-spaces',
    'street-lighting',
    'graffiti-vandalism',
    'drainage-flooding',
    'waste-recycling',
    'noise-pollution',
    'abandoned-vehicles',
  ])('renders decorative duotone artwork for %s without repeating its label', (slug) => {
    const { container } = render(<CategoryIcon slug={slug} size={32} className="shrink-0" />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('focusable', 'false');
    expect(icon).toHaveAttribute('width', '32');
    expect(icon).toHaveClass('shrink-0');
    expect(icon?.querySelector('[opacity]')).not.toBeNull();
    expect(container.textContent).toBe('');
  });

  it.each([undefined, null, 'custom-category', 'constructor', '__proto__'])(
    'provides a safe generic fallback for %s',
    (slug) => {
      const { container } = render(<CategoryIcon slug={slug} />);
      expect(container.querySelectorAll('svg')).toHaveLength(1);
      expect(getCategoryTone(slug)).toBe('bg-muted text-muted-foreground');
    },
  );

  it('uses distinct road and park artwork and theme-aware category tones', () => {
    const { container, rerender } = render(<CategoryIcon slug="road-pavement" />);
    const road = container.innerHTML;
    rerender(<CategoryIcon slug="parks-green-spaces" />);
    expect(container.innerHTML).not.toBe(road);
    expect(getCategoryTone('road-pavement')).toContain('dark:text-');
    expect(getCategoryTone('parks-green-spaces')).toContain('dark:text-');
  });
});
