"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface Team {
  id: string;
  teamName: string;
  slotId: number;
}

interface Override {
  id: string;
  playerId: string;
  teamId: string;
  seasonYear: number;
  overrideRound: number;
  player: Player;
  team: Team;
}

interface OverridesResponse {
  seasonYear: number;
  overrides: Override[];
  teams: Team[];
  availableSeasons: number[];
}

interface RosterPlayer {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
  };
  calculation: {
    isEligible: boolean;
    keeperRound: number | null;
  };
}

interface RosterResponse {
  players: RosterPlayer[];
}

export default function AdminKeeperOverridesPage() {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add override form state
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamPlayers, setTeamPlayers] = useState<RosterPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [overrideRound, setOverrideRound] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // Initial load
  useEffect(() => {
    fetchOverrides();
  }, []);

  // Fetch when season changes
  useEffect(() => {
    if (selectedYear !== null) {
      fetchOverrides(selectedYear);
    }
  }, [selectedYear]);

  // Fetch players when team is selected
  useEffect(() => {
    if (selectedTeamId && selectedYear) {
      fetchTeamPlayers(selectedTeamId, selectedYear);
    } else {
      setTeamPlayers([]);
      setSelectedPlayerId("");
    }
  }, [selectedTeamId, selectedYear]);

  async function fetchOverrides(year?: number) {
    try {
      setLoading(true);
      setError(null);
      const url = year
        ? `/api/admin/keeper-overrides?year=${year}`
        : "/api/admin/keeper-overrides";
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

      // Set data even if there's an error (partial data is still useful)
      setOverrides(data.overrides || []);
      setTeams(data.teams || []);

      if (selectedYear === null && data.seasonYear) {
        setSelectedYear(data.seasonYear);
      }

      // Show error message if present, but don't throw
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overrides");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeamPlayers(teamId: string, year: number) {
    try {
      setLoadingPlayers(true);
      // Target year for keeper cost = selected season year
      // Team roster is from previous year (year - 1)
      const res = await fetch(`/api/teams/${teamId}/roster?targetYear=${year}`);

      if (!res.ok) {
        throw new Error("Failed to load team roster");
      }

      const data: RosterResponse = await res.json();
      setTeamPlayers(data.players || []);
      setSelectedPlayerId("");
    } catch (err) {
      console.error("Error loading team roster:", err);
      setTeamPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function addOverride() {
    if (!selectedPlayerId || !selectedTeamId || !overrideRound || !selectedYear) {
      setError("Please fill in all fields");
      return;
    }

    const round = parseInt(overrideRound, 10);
    if (isNaN(round) || round < 1 || round > 28) {
      setError("Round must be between 1 and 28");
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/keeper-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          teamId: selectedTeamId,
          seasonYear: selectedYear,
          overrideRound: round,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add override");
      }

      setOverrides([data.override, ...overrides]);
      setSuccess("Override added successfully");
      setSelectedPlayerId("");
      setOverrideRound("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add override");
    } finally {
      setAdding(false);
    }
  }

  async function removeOverride(id: string) {
    if (!confirm("Are you sure you want to remove this override?")) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/keeper-overrides/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove override");
      }

      setOverrides(overrides.filter((o) => o.id !== id));
      setSuccess("Override removed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove override");
    }
  }

  function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const year = parseInt(e.target.value, 10);
    setSelectedYear(year);
    setSelectedTeamId("");
    setSelectedPlayerId("");
    setOverrideRound("");
    setSuccess(null);
  }

  function handleTeamChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedTeamId(e.target.value);
    setSelectedPlayerId("");
    setOverrideRound("");
  }

  if (loading && overrides.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Keeper Overrides
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Commissioner: Override keeper costs for special circumstances
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
            Keeper Season Year
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
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Overrides apply to keeper selections for the {selectedYear} draft.
          </p>
        </div>

        {/* Add Override Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Add New Override
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Select */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Team
              </label>
              <select
                value={selectedTeamId}
                onChange={handleTeamChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            {/* Player Select */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Player
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                disabled={!selectedTeamId || loadingPlayers}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">
                  {loadingPlayers
                    ? "Loading players..."
                    : selectedTeamId
                    ? "Select a player..."
                    : "Select team first"}
                </option>
                {teamPlayers.map((p) => (
                  <option key={p.player.id} value={p.player.id}>
                    {p.player.firstName} {p.player.lastName} ({p.player.position})
                    {p.calculation.isEligible
                      ? ` - R${p.calculation.keeperRound}`
                      : " - INELIGIBLE"}
                  </option>
                ))}
              </select>
            </div>

            {/* Round Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Override Round
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={overrideRound}
                onChange={(e) => setOverrideRound(e.target.value)}
                placeholder="1-28"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Add Button */}
            <div className="flex items-end">
              <button
                onClick={addOverride}
                disabled={adding || !selectedPlayerId || !overrideRound}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Adding..." : "Add Override"}
              </button>
            </div>
          </div>
        </div>

        {/* Current Overrides */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Current Overrides for {selectedYear}
            </h2>
          </div>

          {overrides.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              <p>No overrides for {selectedYear} season.</p>
              <p className="text-sm mt-2">
                Use the form above to add an override.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Team
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-24">
                    Round
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-24">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {overrides.map((override) => (
                  <tr
                    key={override.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {override.player.firstName} {override.player.lastName}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {override.player.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {override.team.teamName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                        R{override.overrideRound}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeOverride(override.id)}
                        className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Note:</span> Overrides replace the calculated keeper cost
            for a specific player, team, and season. The player becomes eligible regardless of their
            normal calculated status. Overrides only apply to the specified season.
          </p>
        </div>
      </div>
    </div>
  );
}
