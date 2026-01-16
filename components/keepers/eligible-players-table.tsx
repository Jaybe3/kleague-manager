"use client";

import { useState, useMemo } from "react";
import { EligiblePlayer } from "@/lib/keeper/selection-types";

type SortField = "name" | "position" | "keeperCost";
type SortDirection = "asc" | "desc";

const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

interface EligiblePlayersTableProps {
  players: EligiblePlayer[];
  canSelectMore: boolean;
  isFinalized: boolean;
  onSelect: (playerId: string) => Promise<void>;
}

export function EligiblePlayersTable({
  players,
  canSelectMore,
  isFinalized,
  onSelect,
}: EligiblePlayersTableProps) {
  const [sortField, setSortField] = useState<SortField>("keeperCost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);

  // Get unique positions for filter dropdown
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(players.map((p) => p.player.position))];
    return uniquePositions.sort(
      (a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
    );
  }, [players]);

  // Filter and sort players
  const displayedPlayers = useMemo(() => {
    let filtered = [...players];

    // Apply position filter
    if (positionFilter !== "all") {
      filtered = filtered.filter((p) => p.player.position === positionFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = `${a.player.firstName} ${a.player.lastName}`.localeCompare(
            `${b.player.firstName} ${b.player.lastName}`
          );
          break;
        case "position":
          comparison =
            (POSITION_ORDER[a.player.position] ?? 99) -
            (POSITION_ORDER[b.player.position] ?? 99);
          break;
        case "keeperCost":
          comparison = a.keeperCost - b.keeperCost;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [players, sortField, sortDirection, positionFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "keeperCost" ? "desc" : "asc");
    }
  };

  const handleSelect = async (playerId: string) => {
    setLoadingPlayerId(playerId);
    try {
      await onSelect(playerId);
    } finally {
      setLoadingPlayerId(null);
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

  // Find best value players (highest round = better value)
  const bestValueThreshold = useMemo(() => {
    const costs = players
      .filter((p) => !p.isSelected)
      .map((p) => p.keeperCost)
      .sort((a, b) => b - a);
    return costs[Math.min(2, costs.length - 1)] ?? 99;
  }, [players]);

  const unselectedPlayers = displayedPlayers.filter((p) => !p.isSelected);

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No eligible players on roster.
      </div>
    );
  }

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

        <div className="text-sm text-zinc-500 dark:text-zinc-400 ml-auto">
          {unselectedPlayers.length} available
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
              <th
                className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                onClick={() => handleSort("keeperCost")}
              >
                Keeper Cost
                <SortIcon field="keeperCost" />
              </th>
              {!isFinalized && (
                <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedPlayers.map((item) => {
              const isLoading = loadingPlayerId === item.player.id;
              const isBestValue =
                !item.isSelected && item.keeperCost >= bestValueThreshold;

              return (
                <tr
                  key={item.player.id}
                  className={`border-b border-zinc-100 dark:border-zinc-700/50 ${
                    item.isSelected
                      ? "bg-green-50/50 dark:bg-green-900/10 opacity-50"
                      : "bg-white dark:bg-zinc-800"
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.player.firstName} {item.player.lastName}
                      </span>
                      {isBestValue && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                          Best Value
                        </span>
                      )}
                      {item.isSelected && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                          Selected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">
                    {item.player.position}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Round {item.keeperCost}
                    </span>
                  </td>
                  {!isFinalized && (
                    <td className="py-3 px-2 text-center">
                      {item.isSelected ? (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          Already selected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelect(item.player.id)}
                          disabled={isLoading || !canSelectMore}
                          className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? "..." : "Select"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unselectedPlayers.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No available players match the current filters.
        </div>
      )}
    </div>
  );
}
