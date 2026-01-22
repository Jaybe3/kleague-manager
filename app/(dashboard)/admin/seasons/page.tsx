"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DeadlineState } from "@/lib/keeper/selection-types";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Season {
  year: number;
  isActive: boolean;
  totalRounds: number;
  keeperDeadline: string;
  deadlineState: DeadlineState;
}

export default function AdminSeasonsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editingDeadline, setEditingDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, []);

  async function fetchSeasons() {
    try {
      const res = await fetch("/api/admin/seasons");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load seasons");
      }
      const data = await res.json();
      setSeasons(data.seasons);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seasons");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(season: Season) {
    setEditingYear(season.year);
    // Convert to datetime-local format
    const date = new Date(season.keeperDeadline);
    const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditingDeadline(localDatetime);
  }

  function cancelEditing() {
    setEditingYear(null);
    setEditingDeadline("");
  }

  async function saveDeadline(year: number) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/seasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          keeperDeadline: new Date(editingDeadline).toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update deadline");
      }

      await fetchSeasons();
      setEditingYear(null);
      setEditingDeadline("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save deadline");
    } finally {
      setSaving(false);
    }
  }

  function formatDeadline(deadline: string) {
    return new Date(deadline).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStateColor(state: DeadlineState) {
    switch (state) {
      case "passed":
        return "bg-error/20 text-error";
      case "urgent":
        return "bg-error/20 text-error animate-pulse";
      case "approaching":
        return "bg-warning/20 text-warning";
      case "open":
      default:
        return "bg-primary/20 text-primary";
    }
  }

  function getStateLabel(state: DeadlineState) {
    switch (state) {
      case "passed":
        return "Passed";
      case "urgent":
        return "< 24 hours";
      case "approaching":
        return "< 7 days";
      case "open":
      default:
        return "Open";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Manage Keeper Deadlines"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
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
        title="Manage Keeper Deadlines"
        description="Set and manage keeper selection deadlines for each season"
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

      {/* Info Panel */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium text-foreground mb-2">
            Deadline States
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><span className="font-medium text-primary">Open:</span> More than 7 days until deadline</li>
            <li><span className="font-medium text-warning">Approaching:</span> 7 days or less remaining</li>
            <li><span className="font-medium text-error">Urgent:</span> Less than 24 hours remaining</li>
            <li><span className="font-medium text-error">Passed:</span> Deadline has passed, selections are locked</li>
          </ul>
        </CardContent>
      </Card>

      {/* Seasons Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Season
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Keeper Deadline
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    State
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seasons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No seasons found. Import draft data first.
                    </td>
                  </tr>
                ) : (
                  seasons.map((season) => (
                    <tr key={season.year} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {season.year}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {season.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-success/20 text-success">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingYear === season.year ? (
                          <Input
                            type="datetime-local"
                            value={editingDeadline}
                            onChange={(e) => setEditingDeadline(e.target.value)}
                            className="w-auto"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {formatDeadline(season.keeperDeadline)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStateColor(
                            season.deadlineState
                          )}`}
                        >
                          {getStateLabel(season.deadlineState)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingYear === season.year ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => saveDeadline(season.year)}
                              disabled={saving}
                            >
                              {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => startEditing(season)}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Season activation is set during data import.
            This page manages keeper deadlines.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
