"use client";

import { DraftBoardKeeper } from "@/lib/draft-board/types";

interface DraftBoardCellProps {
  keeper: DraftBoardKeeper | null;
}

export function DraftBoardCell({ keeper }: DraftBoardCellProps) {
  if (!keeper) {
    // Empty cell - available pick
    return (
      <div className="h-full min-h-[60px] bg-muted/30 border border-border/50 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/50">—</span>
      </div>
    );
  }

  // Keeper cell - taken pick
  return (
    <div className="h-full min-h-[60px] bg-primary/20 border border-primary/30 p-2 flex flex-col justify-center">
      <div className="text-xs font-semibold text-primary truncate">
        {keeper.playerName}
      </div>
      <div className="text-xs text-primary/70">
        {keeper.position} <span className="font-medium">(K)</span>
      </div>
    </div>
  );
}
