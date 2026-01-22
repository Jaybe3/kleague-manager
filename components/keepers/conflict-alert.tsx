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
    <div className="bg-error/10 border border-error/20 rounded-md p-4">
      <h3 className="text-error font-semibold mb-2">
        Round Conflicts Detected
      </h3>
      <p className="text-error/80 text-sm mb-3">
        Multiple players are assigned to the same round. You must bump one player
        to an earlier round before finalizing.
      </p>
      <ul className="space-y-2">
        {conflicts.map((conflict) => (
          <li
            key={conflict.round}
            className="text-error/80 text-sm"
          >
            <span className="font-medium text-error">Round {conflict.round}:</span>{" "}
            {conflict.players.map((p) => p.name).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
