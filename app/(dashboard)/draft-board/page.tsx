"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DraftBoardResponse } from "@/lib/draft-board/types";
import { DraftBoardGrid } from "@/components/draft-board/draft-board-grid";
import { DraftBoardLegend } from "@/components/draft-board/draft-board-legend";

export default function DraftBoardPage() {
  const router = useRouter();
  const [data, setData] = useState<DraftBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/draft-board");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load draft board");
        }
        const result: DraftBoardResponse = await res.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-8"></div>
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                ))}
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
        <div className="max-w-7xl mx-auto">
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

  // Count keepers per team for summary
  const keeperCounts = new Map<string, number>();
  for (const keeper of data.keepers) {
    keeperCounts.set(keeper.teamId, (keeperCounts.get(keeper.teamId) || 0) + 1);
  }
  const teamsWithKeepers = keeperCounts.size;
  const totalKeepers = data.keepers.length;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Draft Board - {data.season.year} Season
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {data.season.totalRounds} rounds | {data.teams.length} teams | Max {data.season.maxKeepers} keepers per team
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/my-team")}
                className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
              >
                Back to My Team
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <span className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-semibold">{totalKeepers}</span> keepers finalized
              </span>
            </div>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{teamsWithKeepers}</span> of {data.teams.length} teams submitted
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4">
          <DraftBoardLegend />
        </div>

        {/* Draft Board Grid */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          {data.keepers.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <p className="text-lg font-medium">No finalized keepers yet</p>
              <p className="text-sm mt-2">
                The board will populate as teams finalize their keeper selections.
              </p>
            </div>
          ) : (
            <DraftBoardGrid
              teams={data.teams}
              keepers={data.keepers}
              totalRounds={data.season.totalRounds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
