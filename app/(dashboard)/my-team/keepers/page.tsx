"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConflictAlert } from "@/components/keepers/conflict-alert";
import { SelectedKeepersTable } from "@/components/keepers/selected-keepers-table";
import { EligiblePlayersTable } from "@/components/keepers/eligible-players-table";
import {
  KeeperSelectionsResponse,
  DeadlineInfo,
} from "@/lib/keeper/selection-types";

export default function KeepersPage() {
  const router = useRouter();
  const [data, setData] = useState<KeeperSelectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/my-team/keepers");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load keeper data");
      }
      const result: KeeperSelectionsResponse = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectPlayer = async (playerId: string) => {
    setActionError(null);
    try {
      const res = await fetch("/api/my-team/keepers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to select player");
      }
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to select");
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/my-team/keepers/${playerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove player");
      }
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleBumpPlayer = async (playerId: string, newRound: number) => {
    setActionError(null);
    try {
      const res = await fetch("/api/my-team/keepers/bump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, newRound }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to bump player");
      }
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to bump");
    }
  };

  const getBumpOptions = async (playerId: string): Promise<number[]> => {
    try {
      const res = await fetch(`/api/my-team/keepers/bump?playerId=${playerId}`);
      if (!res.ok) {
        return [];
      }
      const result = await res.json();
      return result.options || [];
    } catch {
      return [];
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Are you sure you want to finalize your keeper selections? This cannot be undone.")) {
      return;
    }

    setFinalizing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/my-team/keepers/finalize", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to finalize");
      }
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to finalize");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-8"></div>
              <div className="space-y-3">
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md p-4">
              <h2 className="text-red-800 dark:text-red-400 font-semibold mb-2">
                Error
              </h2>
              <p className="text-red-700 dark:text-red-500">{error}</p>
              <button
                onClick={() => router.push("/my-team")}
                className="mt-4 px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
              >
                Back to My Team
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const canSelectMore = data.deadlineInfo.canModify;
  const canFinalize = data.selections.length > 0 && data.conflicts.length === 0 && !data.isFinalized && data.deadlineInfo.canModify;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Keeper Selection
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {data.team.teamName} - {data.season.year} Season
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/my-team")}
                className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
              >
                Back to Roster
              </button>
              {!data.isFinalized && (
                <button
                  onClick={handleFinalize}
                  disabled={!canFinalize || finalizing}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {finalizing ? "Finalizing..." : "Finalize Selections"}
                </button>
              )}
            </div>
          </div>

          {/* Deadline Banner */}
          <DeadlineBanner deadlineInfo={data.deadlineInfo} isFinalized={data.isFinalized} />
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md p-4">
            <p className="text-red-700 dark:text-red-500">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Conflicts Alert */}
        {!data.isFinalized && <ConflictAlert conflicts={data.conflicts} />}

        {/* Selected Keepers */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Selected Keepers ({data.selections.length})
          </h2>
          <SelectedKeepersTable
            selections={data.selections}
            totalRounds={data.season.totalRounds}
            isFinalized={data.isFinalized}
            onRemove={handleRemovePlayer}
            onBump={handleBumpPlayer}
            getBumpOptions={getBumpOptions}
          />
        </div>

        {/* Eligible Players */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Eligible Players
          </h2>
          <EligiblePlayersTable
            players={data.eligiblePlayers}
            canSelectMore={canSelectMore}
            isFinalized={data.isFinalized}
            onSelect={handleSelectPlayer}
          />
        </div>
      </div>
    </div>
  );
}

// Deadline Banner Component
function DeadlineBanner({ deadlineInfo, isFinalized }: { deadlineInfo: DeadlineInfo; isFinalized: boolean }) {
  if (isFinalized) {
    return (
      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
          Your keeper selections have been finalized.
        </p>
      </div>
    );
  }

  const deadlineDate = new Date(deadlineInfo.deadline).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  switch (deadlineInfo.state) {
    case 'passed':
      return (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            Deadline has passed - selections are locked
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            Deadline was: {deadlineDate}
          </p>
        </div>
      );

    case 'urgent':
      return (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md animate-pulse">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            Less than 24 hours remaining!
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            Deadline: {deadlineDate}
          </p>
        </div>
      );

    case 'approaching':
      return (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
            Deadline approaching
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
            Deadline: {deadlineDate}
          </p>
        </div>
      );

    case 'open':
    default:
      return (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <span className="font-medium">Deadline:</span> {deadlineDate}
          </p>
        </div>
      );
  }
}
