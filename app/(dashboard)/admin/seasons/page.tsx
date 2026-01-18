"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DeadlineState } from "@/lib/keeper/selection-types";

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
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse";
      case "approaching":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "open":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
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
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Manage Keeper Deadlines
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Commissioner: Set and manage keeper selection deadlines for each season
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
            <p className="text-red-700 dark:text-red-500">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            Deadline States
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li><span className="font-medium">Open:</span> More than 7 days until deadline</li>
            <li><span className="font-medium">Approaching:</span> 7 days or less remaining</li>
            <li><span className="font-medium">Urgent:</span> Less than 24 hours remaining</li>
            <li><span className="font-medium">Passed:</span> Deadline has passed, selections are locked</li>
          </ul>
        </div>

        {/* Seasons Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Season
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Keeper Deadline
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  State
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {seasons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No seasons found. Import draft data first.
                  </td>
                </tr>
              ) : (
                seasons.map((season) => (
                  <tr key={season.year} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {season.year}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {season.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingYear === season.year ? (
                        <input
                          type="datetime-local"
                          value={editingDeadline}
                          onChange={(e) => setEditingDeadline(e.target.value)}
                          className="px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                        />
                      ) : (
                        <span className="text-zinc-700 dark:text-zinc-300 text-sm">
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
                          <button
                            onClick={() => saveDeadline(season.year)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(season)}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Note:</span> Season activation is set during data import.
            This page manages keeper deadlines.
          </p>
        </div>
      </div>
    </div>
  );
}
