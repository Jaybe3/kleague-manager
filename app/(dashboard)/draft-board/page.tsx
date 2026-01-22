"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DraftBoardResponse } from "@/lib/draft-board/types";
import { DraftBoardGrid } from "@/components/draft-board/draft-board-grid";
import { DraftBoardLegend } from "@/components/draft-board/draft-board-legend";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function DraftBoardPage() {
  const router = useRouter();
  const [data, setData] = useState<DraftBoardResponse | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedYear !== null && data?.season.year !== selectedYear) {
      fetchData(selectedYear);
    }
  }, [selectedYear]);

  async function fetchData(year?: number) {
    try {
      setLoading(true);
      const url = year ? `/api/draft-board?year=${year}` : "/api/draft-board";
      const res = await fetch(url);

      const result = await res.json();

      // Always set available seasons if present
      if (result.availableSeasons) {
        setAvailableSeasons(result.availableSeasons);
      }

      if (!res.ok && !result.availableSeasons) {
        throw new Error(result.error || "Failed to load draft board");
      }

      setData(result);
      if (selectedYear === null && result.season?.year) {
        setSelectedYear(result.season.year);
      }
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function handleSeasonChange(value: string) {
    const year = parseInt(value, 10);
    setSelectedYear(year);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Draft Board"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="space-y-2 mt-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Draft Board"
          description="Error loading draft board"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="bg-error/10 border border-error/20 rounded-md p-4">
              <h2 className="text-error font-semibold mb-2">Error</h2>
              <p className="text-error/80">{error}</p>
              <Button
                variant="outline"
                onClick={() => router.push("/my-team")}
                className="mt-4"
              >
                Back to My Team
              </Button>
            </div>
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      <PageHeader
        title="Draft Board"
        description={`${data.season.totalRounds} rounds | ${data.teams.length} teams`}
        actions={
          <Select
            value={selectedYear?.toString() ?? ""}
            onValueChange={handleSeasonChange}
            disabled={loading}
          >
            <SelectTrigger className="w-[140px] bg-background border-border">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year} Season
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-md">
                <span className="text-sm text-primary">
                  <span className="font-semibold">{totalKeepers}</span> keepers finalized
                </span>
              </div>
              <div className="px-3 py-2 bg-muted border border-border rounded-md">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{teamsWithKeepers}</span> of {data.teams.length} teams submitted
                </span>
              </div>
            </div>
            <DraftBoardLegend />
          </div>
        </CardContent>
      </Card>

      {/* Draft Board Grid */}
      <Card>
        <CardContent className="pt-6">
          {data.teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No teams found for this season</p>
              <p className="text-sm mt-2">
                Select a different season or import draft data first.
              </p>
            </div>
          ) : (
            <DraftBoardGrid
              teams={data.teams}
              keepers={data.keepers}
              totalRounds={data.season.totalRounds}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
