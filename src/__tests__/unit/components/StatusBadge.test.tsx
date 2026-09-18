import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['created', 'Created'],
    ['under_validation', 'Under Validation'],
    ['validated', 'Validated'],
    ['invalid', 'Invalid'],
    ['assigned', 'Assigned'],
    ['in_progress', 'In Progress'],
    ['resolved', 'Resolved'],
    ['closed', 'Closed'],
  ])('keeps the %s state readable without relying on colour alone', (status, label) => {
    render(<StatusBadge status={status} className="test-class" />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass('status-badge', 'test-class');
    expect(badge.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('displays unknown statuses with a neutral fallback', () => {
    render(<StatusBadge status="custom-status" />);
    expect(screen.getByText('custom-status')).toHaveClass('bg-muted', 'text-muted-foreground');
  });
});
