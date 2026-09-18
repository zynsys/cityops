'use client';

import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { CategoryIcon, getCategoryTone } from '@/components/ui/CategoryIcon';
import type { CategorySummary } from '@/db/queries/categories';

interface CategoryCardProps {
  category: CategorySummary;
  selected: boolean;
  onSelect: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
}

const CategoryCard = forwardRef<HTMLButtonElement, CategoryCardProps>(function CategoryCard(
  { category, selected, onSelect, onKeyDown, tabIndex },
  ref,
) {
  const { name, description, slug } = category;

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      tabIndex={tabIndex ?? -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={[
        'relative flex h-full min-h-40 w-full flex-col items-start gap-3 rounded-2xl p-4 text-left sm:p-5',
        'border bg-surface transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-accent shadow-soft ring-1 ring-accent'
          : 'border-border hover:border-accent/50 hover:bg-muted/40',
      ].join(' ')}
    >
      {/* Checkmark badge when selected */}
      {selected && (
        <span
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground"
          aria-hidden="true"
        >
          <Check size={14} strokeWidth={2.5} />
        </span>
      )}

      {/* Icon area */}
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getCategoryTone(slug)}`}>
        <CategoryIcon slug={slug} size={30} />
      </span>

      {/* Name */}
      <span className="w-full text-sm leading-snug font-semibold wrap-break-word text-foreground">{name}</span>

      {/* Description stays readable instead of being truncated to one line. */}
      {description && <span className="w-full text-xs leading-relaxed text-muted-foreground">{description}</span>}
    </button>
  );
});

export default CategoryCard;
