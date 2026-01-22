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
import { Button } from "@/components/ui/button";

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

  if (loading && teams.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Set Draft Order"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
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
        title="Set Draft Order"
        description="Set the draft pick order for each season"
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
            Season Year
          </label>
          <Select
            value={selectedYear?.toString() ?? ""}
            onValueChange={(value) => {
              setSelectedYear(parseInt(value, 10));
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
        </CardContent>
      </Card>

      {/* Draft Order Table */}
      <Card>
        <CardContent className="pt-6">
          {teams.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No teams found for {selectedYear} season.</p>
              <p className="text-sm mt-2">Select a different season or import draft data first.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-16">
                      Pick
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Team Name
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-24">
                      Move
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teams.map((team, index) => (
                    <tr
                      key={team.id}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {team.draftPosition}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {team.teamName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Slot {team.slotId})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveTeam(index, "up")}
                            disabled={index === 0 || saving}
                            className="h-8 w-8"
                            title="Move up"
                          >
                            <svg
                              className="w-4 h-4"
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
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveTeam(index, "down")}
                            disabled={index === teams.length - 1 || saving}
                            className="h-8 w-8"
                            title="Move down"
                          >
                            <svg
                              className="w-4 h-4"
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
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {teams.length > 0 && (
        <div className="flex justify-end gap-3">
          {hasChanges && (
            <Button
              variant="secondary"
              onClick={() => fetchDraftOrder(selectedYear ?? undefined)}
              disabled={saving}
            >
              Reset
            </Button>
          )}
          <Button
            onClick={saveDraftOrder}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Save Draft Order"}
          </Button>
        </div>
      )}

      {/* Info Note */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Draft order determines the column order
            on the Draft Board. Pick 1 picks first each round.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
