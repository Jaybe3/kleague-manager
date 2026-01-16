"use client";

export function DraftBoardLegend() {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded" />
        <span className="text-zinc-600 dark:text-zinc-400">Keeper (taken)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded" />
        <span className="text-zinc-600 dark:text-zinc-400">Available</span>
      </div>
    </div>
  );
}
