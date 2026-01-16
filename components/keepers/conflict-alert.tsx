"use client";

import { RoundConflict } from "@/lib/keeper/selection-types";

interface ConflictAlertProps {
  conflicts: RoundConflict[];
}

export function ConflictAlert({ conflicts }: ConflictAlertProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md p-4 mb-4">
      <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">
        Round Conflicts Detected
      </h3>
      <p className="text-red-700 dark:text-red-500 text-sm mb-3">
        Multiple players are assigned to the same round. You must bump one player
        to an earlier round before finalizing.
      </p>
      <ul className="space-y-2">
        {conflicts.map((conflict) => (
          <li
            key={conflict.round}
            className="text-red-700 dark:text-red-500 text-sm"
          >
            <span className="font-medium">Round {conflict.round}:</span>{" "}
            {conflict.players.map((p) => p.name).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
