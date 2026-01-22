"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  if (loading && overrides.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Keeper Overrides"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keeper Overrides"
        description="Override keeper costs for special circumstances"
      />

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md p-4">
          <p className="text-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-error/80 underline hover:text-error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-md p-4">
          <p className="text-success">{success}</p>
        </div>
      )}

      {/* Season Selector */}
      <Card>
        <CardContent className="pt-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Keeper Season Year
          </label>
          <Select
            value={selectedYear?.toString() ?? ""}
            onValueChange={(value) => {
              const year = parseInt(value, 10);
              setSelectedYear(year);
              setSelectedTeamId("");
              setSelectedPlayerId("");
              setOverrideRound("");
              setSuccess(null);
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Overrides apply to keeper selections for the {selectedYear} draft.
          </p>
        </CardContent>
      </Card>

      {/* Add Override Form */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Add New Override
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Team
              </label>
              <Select
                value={selectedTeamId}
                onValueChange={(value) => {
                  setSelectedTeamId(value);
                  setSelectedPlayerId("");
                  setOverrideRound("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Player Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Player
              </label>
              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={!selectedTeamId || loadingPlayers}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPlayers
                        ? "Loading players..."
                        : selectedTeamId
                        ? "Select a player..."
                        : "Select team first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamPlayers.map((p) => (
                    <SelectItem key={p.player.id} value={p.player.id}>
                      {p.player.firstName} {p.player.lastName} ({p.player.position})
                      {p.calculation.isEligible
                        ? ` - R${p.calculation.keeperRound}`
                        : " - INELIGIBLE"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Round Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Override Round
              </label>
              <Input
                type="number"
                min={1}
                max={28}
                value={overrideRound}
                onChange={(e) => setOverrideRound(e.target.value)}
                placeholder="1-28"
              />
            </div>

            {/* Add Button */}
            <div className="flex items-end">
              <Button
                onClick={addOverride}
                disabled={adding || !selectedPlayerId || !overrideRound}
                className="w-full"
              >
                {adding ? "Adding..." : "Add Override"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Overrides */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Current Overrides for {selectedYear}
          </h2>

          {overrides.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No overrides for {selectedYear} season.</p>
              <p className="text-sm mt-2">
                Use the form above to add an override.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Team
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-24">
                      Round
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-24">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overrides.map((override) => (
                    <tr
                      key={override.id}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {override.player.firstName} {override.player.lastName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {override.player.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {override.team.teamName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-warning/20 text-warning font-semibold text-sm">
                          R{override.overrideRound}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOverride(override.id)}
                          className="text-error hover:text-error hover:bg-error/10"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Overrides replace the calculated keeper cost
            for a specific player, team, and season. The player becomes eligible regardless of their
            normal calculated status. Overrides only apply to the specified season.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
