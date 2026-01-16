"use client";

import { useState, useMemo } from "react";
import { KeeperCostResult } from "@/lib/keepers/types";

type SortField = "name" | "position" | "keeperCost" | "status";
type SortDirection = "asc" | "desc";

interface RosterTableProps {
  players: KeeperCostResult[];
}

const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

export function RosterTable({ players }: RosterTableProps) {
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Get unique positions for filter dropdown
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(players.map((p) => p.position))];
    return uniquePositions.sort(
      (a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
    );
  }, [players]);

  // Filter and sort players
  const displayedPlayers = useMemo(() => {
    let filtered = [...players];

    // Apply position filter
    if (positionFilter !== "all") {
      filtered = filtered.filter((p) => p.position === positionFilter);
    }

    // Apply eligible filter
    if (eligibleOnly) {
      filtered = filtered.filter((p) => p.isEligible);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case "position":
          comparison =
            (POSITION_ORDER[a.position] ?? 99) -
            (POSITION_ORDER[b.position] ?? 99);
          break;
        case "keeperCost":
          // Ineligible players (null cost) go to the end
          const costA = a.keeperCost ?? 99;
          const costB = b.keeperCost ?? 99;
          comparison = costA - costB;
          break;
        case "status":
          comparison = (a.isEligible ? 0 : 1) - (b.isEligible ? 0 : 1);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [players, sortField, sortDirection, positionFilter, eligibleOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-zinc-400 ml-1">↕</span>;
    }
    return (
      <span className="text-blue-500 ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Find best value players (eligible with lowest cost)
  const bestValueThreshold = useMemo(() => {
    const eligibleCosts = players
      .filter((p) => p.isEligible && p.keeperCost !== null)
      .map((p) => p.keeperCost as number)
      .sort((a, b) => b - a); // Higher round = better value
    return eligibleCosts[Math.min(2, eligibleCosts.length - 1)] ?? 99;
  }, [players]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="position-filter"
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            Position:
          </label>
          <select
            id="position-filter"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          Eligible only
        </label>

        <div className="text-sm text-zinc-500 dark:text-zinc-400 ml-auto">
          Showing {displayedPlayers.length} of {players.length} players
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th
                className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                onClick={() => handleSort("name")}
              >
                Player
                <SortIcon field="name" />
              </th>
              <th
                className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                onClick={() => handleSort("position")}
              >
                Pos
                <SortIcon field="position" />
              </th>
              <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Acquisition
              </th>
              <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Years Kept
              </th>
              <th
                className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                onClick={() => handleSort("keeperCost")}
              >
                Keeper Cost
                <SortIcon field="keeperCost" />
              </th>
              <th
                className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon field="status" />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedPlayers.map((player) => {
              const isBestValue =
                player.isEligible &&
                player.keeperCost !== null &&
                player.keeperCost >= bestValueThreshold;

              return (
                <tr
                  key={player.playerId}
                  className={`border-b border-zinc-100 dark:border-zinc-700/50 ${
                    player.isEligible
                      ? "bg-green-50/50 dark:bg-green-900/10"
                      : "bg-zinc-50/50 dark:bg-zinc-800/50"
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {player.playerName}
                      </span>
                      {isBestValue && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                          Best Value
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">
                    {player.position}
                  </td>
                  <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">
                    {player.acquisitionDisplay}
                  </td>
                  <td className="py-3 px-2 text-center text-zinc-600 dark:text-zinc-400">
                    {player.yearsKept}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {player.isEligible ? (
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Round {player.keeperCost}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {player.isEligible ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full">
                        Eligible
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full">
                        Ineligible
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {displayedPlayers.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No players match the current filters.
        </div>
      )}
    </div>
  );
}
