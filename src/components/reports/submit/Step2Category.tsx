'use client';

import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useReportSubmission } from './ReportSubmissionContext';
import CategoryCard from './CategoryCard';
import type { CategorySummary } from '@/db/queries/categories';

interface Step2CategoryProps {
  categories: CategorySummary[];
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Category({ categories, onBack, onNext }: Step2CategoryProps) {
  const { state, dispatch } = useReportSubmission();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const canProceed = state.categoryId !== null;

  function handleSelect(id: string, name: string) {
    dispatch({ type: 'SET_CATEGORY', categoryId: id, categoryName: name });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const total = categories.length;
    if (total === 0) return;

    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (index + 1) % total;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (index - 1 + total) % total;
    }

    if (next >= 0) {
      cardRefs.current[next]?.focus();
    }
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="empty-state mx-auto max-w-lg gap-3">
            <h2 className="text-lg font-semibold text-foreground">Categories unavailable</h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              This council hasn&apos;t configured any categories yet. Please try again later or contact support.
            </p>
          </div>
        </div>
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
          <button type="button" onClick={onBack} className="btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable category grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto w-full max-w-3xl">
          <p className="eyebrow mb-2">Step 2 · Category</p>
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            What type of problem are you reporting?
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Choose the category that best describes the issue.
          </p>

          <div
            role="group"
            aria-label="Report categories"
            className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-3"
          >
            {categories.map((cat, i) => (
              <CategoryCard
                key={cat.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                category={cat}
                selected={state.categoryId === cat.id}
                onSelect={() => handleSelect(cat.id, cat.name)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                tabIndex={state.categoryId === cat.id ? 0 : state.categoryId === null && i === 0 ? 0 : -1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            'btn-primary min-w-24 shrink-0',
            canProceed ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground shadow-none',
          ].join(' ')}
        >
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
