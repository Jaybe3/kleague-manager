"use client";

import { useState } from "react";
import { KeeperSelectionInfo } from "@/lib/keeper/selection-types";

interface SelectedKeepersTableProps {
  selections: KeeperSelectionInfo[];
  maxKeepers: number;
  isFinalized: boolean;
  onRemove: (playerId: string) => Promise<void>;
  onBump: (playerId: string, newRound: number) => Promise<void>;
  getBumpOptions: (playerId: string) => Promise<number[]>;
}

export function SelectedKeepersTable({
  selections,
  maxKeepers,
  isFinalized,
  onRemove,
  onBump,
  getBumpOptions,
}: SelectedKeepersTableProps) {
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);
  const [bumpOptionsPlayerId, setBumpOptionsPlayerId] = useState<string | null>(null);
  const [bumpOptions, setBumpOptions] = useState<number[]>([]);

  const handleRemove = async (playerId: string) => {
    setLoadingPlayerId(playerId);
    try {
      await onRemove(playerId);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  const handleShowBumpOptions = async (playerId: string) => {
    if (bumpOptionsPlayerId === playerId) {
      setBumpOptionsPlayerId(null);
      setBumpOptions([]);
      return;
    }

    setLoadingPlayerId(playerId);
    try {
      const options = await getBumpOptions(playerId);
      setBumpOptions(options);
      setBumpOptionsPlayerId(playerId);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  const handleBump = async (playerId: string, newRound: number) => {
    setLoadingPlayerId(playerId);
    try {
      await onBump(playerId, newRound);
      setBumpOptionsPlayerId(null);
      setBumpOptions([]);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  if (selections.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
        <p>No keepers selected yet.</p>
        <p className="text-sm mt-1">
          Select up to {maxKeepers} players from your eligible players below.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
              Player
            </th>
            <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
              Pos
            </th>
            <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
              Calculated Cost
            </th>
            <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
              Final Round
            </th>
            {!isFinalized && (
              <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {selections.map((selection) => {
            const isLoading = loadingPlayerId === selection.player.id;
            const showBumpOptions = bumpOptionsPlayerId === selection.player.id;

            return (
              <tr
                key={selection.id}
                className={`border-b border-zinc-100 dark:border-zinc-700/50 ${
                  selection.isBumped
                    ? "bg-yellow-50/50 dark:bg-yellow-900/10"
                    : "bg-white dark:bg-zinc-800"
                }`}
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selection.player.firstName} {selection.player.lastName}
                    </span>
                    {selection.isBumped && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded">
                        Bumped
                      </span>
                    )}
                    {selection.isFinalized && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                        Finalized
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">
                  {selection.player.position}
                </td>
                <td className="py-3 px-2 text-center text-zinc-600 dark:text-zinc-400">
                  Round {selection.calculatedRound}
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`font-semibold ${
                      selection.isBumped
                        ? "text-yellow-700 dark:text-yellow-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    Round {selection.finalRound}
                  </span>
                </td>
                {!isFinalized && (
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleShowBumpOptions(selection.player.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900 disabled:opacity-50 transition-colors"
                      >
                        {showBumpOptions ? "Cancel" : "Bump"}
                      </button>
                      <button
                        onClick={() => handleRemove(selection.player.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {showBumpOptions && (
                      <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-700 rounded">
                        {bumpOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 w-full mb-1">
                              Bump to round:
                            </span>
                            {bumpOptions.map((round) => (
                              <button
                                key={round}
                                onClick={() => handleBump(selection.player.id, round)}
                                disabled={isLoading}
                                className="px-2 py-1 text-xs font-medium bg-white dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded border border-zinc-300 dark:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-500 disabled:opacity-50 transition-colors"
                              >
                                R{round}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            No earlier rounds available
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {selections.length} of {maxKeepers} keepers selected
      </div>
    </div>
  );
}
