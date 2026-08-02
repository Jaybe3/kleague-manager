"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

interface SortOption {
  value: string;
  label: string;
}

/**
 * Mobile-only (md:hidden) sort control for the card views, which have no
 * clickable table headers. A native select for the field plus a direction
 * toggle. Kept dependency-light on purpose.
 */
export function MobileSort({
  value,
  direction,
  options,
  onFieldChange,
  onToggleDirection,
}: {
  value: string;
  direction: "asc" | "desc";
  options: SortOption[];
  onFieldChange: (value: string) => void;
  onToggleDirection: () => void;
}) {
  return (
    <div className="md:hidden flex items-center gap-2 mb-3">
      <select
        value={value}
        onChange={(e) => onFieldChange(e.target.value)}
        className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        aria-label="Sort by"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDirection}
        className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
        aria-label={`Sort direction: ${direction === "asc" ? "ascending" : "descending"}`}
      >
        {direction === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
