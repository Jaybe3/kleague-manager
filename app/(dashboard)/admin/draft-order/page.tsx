"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  teamName: string;
  slotId: number;
  draftPosition: number;
  seasonYear: number;
}

interface DraftOrderResponse {
  seasonYear: number;
  teams: Team[];
  availableSeasons: number[];
}

export default function AdminDraftOrderPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Initial load
  useEffect(() => {
    fetchDraftOrder();
  }, []);

  // Fetch when season changes (but not on initial load)
  useEffect(() => {
    if (initialLoadDone && selectedYear !== null) {
      fetchDraftOrder(selectedYear);
    }
  }, [selectedYear, initialLoadDone]);

  async function fetchDraftOrder(year?: number) {
    try {
      setLoading(true);
      setError(null);
      const url = year
        ? `/api/admin/draft-order?year=${year}`
        : "/api/admin/draft-order";
      const res = await fetch(url);

      if (res.status === 403) {
        router.push("/my-team");
        return;
      }

      const data = await res.json();

      // Always set available seasons if present
      if (data.availableSeasons) {
        setAvailableSeasons(data.availableSeasons);
      }

      // Handle error response (but still have availableSeasons)
      if (data.error && data.teams?.length === 0) {
        setTeams([]);
        if (selectedYear === null && data.seasonYear) {
          setSelectedYear(data.seasonYear);
        }
        setError(data.error);
        setInitialLoadDone(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to load draft order");
      }

      setTeams(data.teams || []);
      if (selectedYear === null && data.seasonYear) {
        setSelectedYear(data.seasonYear);
      }
      setHasChanges(false);
      setInitialLoadDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load draft order");
      setInitialLoadDone(true);
    } finally {
      setLoading(false);
    }
  }

  function moveTeam(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === teams.length - 1) return;

    const newTeams = [...teams];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    // Swap the teams
    [newTeams[index], newTeams[swapIndex]] = [newTeams[swapIndex], newTeams[index]];

    // Update draft positions to match new order
    newTeams.forEach((team, i) => {
      team.draftPosition = i + 1;
    });

    setTeams(newTeams);
    setHasChanges(true);
    setSuccess(null);
  }

  async function saveDraftOrder() {
    if (!selectedYear) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const draftOrder = teams.map((team) => ({
        slotId: team.slotId,
        draftPosition: team.draftPosition,
      }));

      const res = await fetch("/api/admin/draft-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonYear: selectedYear,
          draftOrder,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save draft order");
      }

      const data = await res.json();
      setTeams(data.teams);
      setHasChanges(false);
      setSuccess("Draft order saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft order");
    } finally {
      setSaving(false);
    }
  }

  function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const year = parseInt(e.target.value, 10);
    setSelectedYear(year);
    setSuccess(null);
  }

  if (loading && teams.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Set Draft Order
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Commissioner: Set the draft pick order for each season
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/import")}
              className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
            >
              Back to Admin
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-md p-4">
            <p className="text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Season Selector */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Season Year
          </label>
          <select
            value={selectedYear ?? ""}
            onChange={handleSeasonChange}
            disabled={loading}
            className="w-full md:w-48 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          >
            {availableSeasons.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Draft Order Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          {teams.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              <p>No teams found for {selectedYear} season.</p>
              <p className="text-sm mt-2">Select a different season or import draft data first.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-16">
                    Pick
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Team Name
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-24">
                    Move
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {teams.map((team, index) => (
                  <tr
                    key={team.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold text-sm">
                        {team.draftPosition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {team.teamName}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        (Slot {team.slotId})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => moveTeam(index, "up")}
                          disabled={index === 0 || saving}
                          className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <svg
                            className="w-4 h-4 text-zinc-600 dark:text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveTeam(index, "down")}
                          disabled={index === teams.length - 1 || saving}
                          className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <svg
                            className="w-4 h-4 text-zinc-600 dark:text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Save Button */}
        {teams.length > 0 && (
          <div className="flex justify-end gap-3">
            {hasChanges && (
              <button
                onClick={() => fetchDraftOrder(selectedYear ?? undefined)}
                disabled={saving}
                className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
            <button
              onClick={saveDraftOrder}
              disabled={!hasChanges || saving}
              className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Draft Order"}
            </button>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Note:</span> Draft order determines the column order
            on the Draft Board. Pick 1 picks first each round.
          </p>
        </div>
      </div>
    </div>
  );
}
