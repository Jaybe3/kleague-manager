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
        {/* Header row with team names */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-r border-zinc-300 dark:border-zinc-600 w-16">
              Round
            </th>
            {teams.map((team) => (
              <th
                key={team.id}
                className="px-2 py-2 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-300 dark:border-zinc-600 min-w-[100px]"
              >
                <div className="truncate" title={team.teamName}>
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
              <td className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300 border-r border-b border-zinc-300 dark:border-zinc-600">
                {round}
              </td>

              {/* Team cells */}
              {teams.map((team) => {
                const key = `${team.id}-${round}`;
                const keeper = keeperMap.get(key) || null;

                return (
                  <td
                    key={`${team.id}-${round}`}
                    className="p-0 border-b border-zinc-200 dark:border-zinc-700"
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
