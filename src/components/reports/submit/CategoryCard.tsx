"use client";

import { forwardRef } from "react";
import { Check } from "lucide-react";
import type { CategorySummary } from "@/db/queries/categories";

interface CategoryCardProps {
  category: CategorySummary;
  selected: boolean;
  onSelect: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
}

const CategoryCard = forwardRef<HTMLButtonElement, CategoryCardProps>(
  function CategoryCard(
    { category, selected, onSelect, onKeyDown, tabIndex },
    ref
  ) {
    const { name, description, icon, color } = category;

    // Category colour at ~15% opacity for icon background (hex alpha 26 ≈ 15%)
    const iconBg = color ? `${color}26` : "oklch(74.5% 0.183 62.8 / 0.15)";
    const iconColor = color ?? "oklch(74.5% 0.183 62.8)";

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        tabIndex={tabIndex ?? -1}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        className={[
          "relative flex flex-col items-start gap-2 rounded-xl p-3 text-left w-full",
          "border bg-surface transition-all duration-150",
          "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          selected
            ? "shadow-sm"
            : "border-border hover:border-accent/40",
        ].join(" ")}
        style={
          selected
            ? { borderColor: color ?? "oklch(74.5% 0.183 62.8)", borderWidth: "2px" }
            : {}
        }
      >
        {/* Checkmark badge when selected */}
        {selected && (
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
        )}

        {/* Icon area */}
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon ?? "📋"}
        </span>

        {/* Name */}
        <span className="text-sm font-semibold text-foreground leading-tight">
          {name}
        </span>

        {/* Description — one line, truncated */}
        {description && (
          <span className="text-xs text-muted-foreground truncate w-full">
            {description}
          </span>
        )}
      </button>
    );
  }
);

export default CategoryCard;
