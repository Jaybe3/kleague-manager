/**
 * Small colored pill for a player's position, tinted per position so
 * lists have visual rhythm. Theme-aware via mid-tone text that reads in
 * both light and dark.
 */

const POSITION_STYLES: Record<string, string> = {
  QB: "bg-rose-500/15 text-rose-500 border-rose-500/25",
  RB: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  WR: "bg-sky-500/15 text-sky-500 border-sky-500/25",
  TE: "bg-amber-500/15 text-amber-600 dark:text-amber-500 border-amber-500/25",
  K: "bg-violet-500/15 text-violet-500 border-violet-500/25",
  DEF: "bg-slate-500/15 text-slate-500 border-slate-500/25",
};

export function PositionBadge({
  position,
  className = "",
}: {
  position: string;
  className?: string;
}) {
  const style =
    POSITION_STYLES[position] ??
    "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold border ${style} ${className}`}
    >
      {position}
    </span>
  );
}
