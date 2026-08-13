"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import CategoryCard from "./CategoryCard";
import type { CategorySummary } from "@/db/queries/categories";

interface Step2CategoryProps {
  categories: CategorySummary[];
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Category({
  categories,
  onBack,
  onNext,
}: Step2CategoryProps) {
  const { state, dispatch } = useReportSubmission();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const canProceed = state.categoryId !== null;

  function handleSelect(id: string, name: string) {
    dispatch({ type: "SET_CATEGORY", categoryId: id, categoryName: name });
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const total = categories.length;
    if (total === 0) return;

    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % total;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
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
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-muted-foreground max-w-sm">
            This council hasn&apos;t configured any categories yet. Please try
            again later or contact support.
          </p>
        </div>
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable category grid */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          What type of problem are you reporting?
        </h2>

        <div
          role="group"
          aria-label="Report categories"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
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
              tabIndex={
                state.categoryId === cat.id
                  ? 0
                  : state.categoryId === null && i === 0
                    ? 0
                    : -1
              }
            />
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          aria-disabled={!canProceed}
          className={[
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors shrink-0",
            canProceed
              ? "bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
