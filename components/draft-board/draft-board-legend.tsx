"use client";

export function DraftBoardLegend() {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-primary/20 border border-primary/30 rounded" />
        <span className="text-muted-foreground">Keeper (taken)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-muted/50 border border-border rounded" />
        <span className="text-muted-foreground">Available</span>
      </div>
    </div>
  );
}
