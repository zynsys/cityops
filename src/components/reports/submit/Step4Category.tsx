"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReportSubmission } from "./ReportSubmissionContext";
import CategoryCard from "./CategoryCard";
import type { CategorySummary } from "@/db/queries/categories";

interface Step4CategoryProps {
  categories: CategorySummary[];
  onBack: () => void;
  onNext: () => void;
}

export default function Step4Category({ categories, onBack, onNext }: Step4CategoryProps) {
  const { state, dispatch } = useReportSubmission();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const canProceed = state.categoryId !== null;

  function handleSelect(id: string, name: string) {
    dispatch({ type: "SET_CATEGORY", categoryId: id, categoryName: name });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const total = categories.length;
    if (!total) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % total;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + total) % total;
    }
    if (next >= 0) cardRefs.current[next]?.focus();
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-muted-foreground max-w-sm">
            No categories are available yet. Please try again later or contact support.
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
      <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Hint chip: council + report title */}
        {(state.tenantName || state.title) && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {state.tenantName && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                Council:{" "}
                <span className="font-medium text-foreground">{state.tenantName}</span>
              </span>
            )}
            {state.title && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground max-w-[240px]">
                <span className="font-medium text-foreground truncate">{state.title}</span>
              </span>
            )}
          </div>
        )}

        <h2 className="text-base font-semibold text-foreground mb-4">
          What type of problem are you reporting?
        </h2>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          role="group"
          aria-label="Report categories"
        >
          {categories.map((cat, idx) => (
            <CategoryCard
              key={cat.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              category={cat}
              selected={state.categoryId === cat.id}
              onSelect={() => handleSelect(cat.id, cat.name)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              tabIndex={idx === 0 || state.categoryId === cat.id ? 0 : -1}
            />
          ))}
        </div>
      </div>
      </div>

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
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
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
