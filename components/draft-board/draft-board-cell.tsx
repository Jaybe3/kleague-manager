"use client";

import { DraftBoardKeeper } from "@/lib/draft-board/types";

interface DraftBoardCellProps {
  keeper: DraftBoardKeeper | null;
}

export function DraftBoardCell({ keeper }: DraftBoardCellProps) {
  if (!keeper) {
    // Empty cell - available pick
    return (
      <div className="h-full min-h-[60px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
      </div>
    );
  }

  // Keeper cell - taken pick
  return (
    <div className="h-full min-h-[60px] bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 p-2 flex flex-col justify-center">
      <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 truncate">
        {keeper.playerName}
      </div>
      <div className="text-xs text-amber-700 dark:text-amber-300">
        {keeper.position} <span className="font-medium">(K)</span>
      </div>
    </div>
  );
}
