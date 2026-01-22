"use client";

import { DraftBoardTeam, DraftBoardKeeper } from "@/lib/draft-board/types";
import { DraftBoardCell } from "./draft-board-cell";

interface DraftBoardGridProps {
  teams: DraftBoardTeam[];
  keepers: DraftBoardKeeper[];
  totalRounds: number;
}

export function DraftBoardGrid({ teams, keepers, totalRounds }: DraftBoardGridProps) {
  // Create a lookup map for quick keeper finding: "teamId-round" -> keeper
  const keeperMap = new Map<string, DraftBoardKeeper>();
  for (const keeper of keepers) {
    const key = `${keeper.teamId}-${keeper.keeperRound}`;
    keeperMap.set(key, keeper);
  }

  // Generate rounds array
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]">
        {/* Header row with pick numbers and team names */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-r border-border w-16">
              Round
            </th>
            {teams.map((team) => (
              <th
                key={team.id}
                className="px-2 py-2 text-center border-b border-border min-w-[100px]"
              >
                <div className="text-xs font-bold text-primary">
                  Pick {team.draftPosition}
                </div>
                <div className="text-xs text-muted-foreground truncate" title={team.teamName}>
                  {team.teamName}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body rows - one per round */}
        <tbody>
          {rounds.map((round) => (
            <tr key={round}>
              {/* Round number - sticky */}
              <td className="sticky left-0 z-10 bg-card px-3 py-1 text-center text-sm font-medium text-foreground border-r border-b border-border">
                {round}
              </td>

              {/* Team cells */}
              {teams.map((team) => {
                const key = `${team.id}-${round}`;
                const keeper = keeperMap.get(key) || null;

                return (
                  <td
                    key={`${team.id}-${round}`}
                    className="p-0 border-b border-border/50"
                  >
                    <DraftBoardCell keeper={keeper} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
