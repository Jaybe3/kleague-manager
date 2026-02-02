"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConflictAlert } from "@/components/keepers/conflict-alert";
import { SelectedKeepersTable } from "@/components/keepers/selected-keepers-table";
import { EligiblePlayersTable } from "@/components/keepers/eligible-players-table";
import { TeamSelector } from "@/components/my-team/team-selector";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import {
  KeeperSelectionsResponse,
  DeadlineInfo,
} from "@/lib/keeper/selection-types";

interface TeamOption {
  slotId: number;
  teamName: string;
}

// Wrapper component to provide Suspense boundary for useSearchParams
export default function KeepersPage() {
  return (
    <Suspense fallback={<KeepersPageLoading />}>
      <KeepersPageContent />
    </Suspense>
  );
}

function KeepersPageLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Keeper Selection"
        description="Loading..."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-3 mt-6">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeepersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotIdParam = searchParams.get("slotId");

  const [data, setData] = useState<KeeperSelectionsResponse | null>(null);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [userSlotId, setUserSlotId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Build URL with optional slotId
      const url = slotIdParam
        ? `/api/my-team/keepers?slotId=${slotIdParam}`
        : "/api/my-team/keepers";

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load keeper data");
      }
      const result: KeeperSelectionsResponse = await res.json();
      setData(result);
      setError(null);

      // If commissioner, also fetch all teams for the selector
      if (result.isCommissioner) {
        const slotsRes = await fetch("/api/slots");
        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setAllTeams(slotsData.slots || []);
          // Find user's own slot
          const ownSlot = slotsData.slots?.find((s: TeamOption & { managerId?: string }) =>
            !result.isViewingOther || s.slotId === result.team.slotId
          );
          // Get user's slot from their own team if not viewing other
          if (!result.isViewingOther) {
            setUserSlotId(result.team.slotId);
          } else {
            // Need to figure out user's slot - fetch without slotId param
            const ownRes = await fetch("/api/my-team/keepers");
            if (ownRes.ok) {
              const ownData = await ownRes.json();
              setUserSlotId(ownData.team?.slotId ?? null);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [slotIdParam]);

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
      <div className="space-y-6">
        <PageHeader
          title="Keeper Selection"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="space-y-3 mt-6">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
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
          title="Keeper Selection"
          description="Error loading keeper data"
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

  const isViewingOther = data.isViewingOther ?? false;
  const isCommissioner = data.isCommissioner ?? false;
  const isReadOnly = isViewingOther || data.isFinalized;
  const canSelectMore = data.deadlineInfo.canModify && !isViewingOther;
  const canFinalize = data.selections.length > 0 && data.conflicts.length === 0 && !data.isFinalized && data.deadlineInfo.canModify && !isViewingOther;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keeper Selection"
        description={`${data.team.teamName} - ${data.season.year} Season`}
        actions={
          <div className="flex items-center gap-3">
            {isCommissioner && allTeams.length > 0 && (
              <TeamSelector
                teams={allTeams}
                currentSlotId={data.team.slotId}
                userSlotId={userSlotId}
                basePath="/my-team/keepers"
              />
            )}
            {!data.isFinalized && !isViewingOther && (
              <Button
                onClick={handleFinalize}
                disabled={!canFinalize || finalizing}
              >
                {finalizing ? "Finalizing..." : "Finalize Selections"}
              </Button>
            )}
          </div>
        }
      />

      {/* Deadline Banner */}
      <DeadlineBanner deadlineInfo={data.deadlineInfo} isFinalized={data.isFinalized} />

      {/* Action Error */}
      {actionError && (
        <div className="bg-error/10 border border-error/20 rounded-md p-4">
          <p className="text-error/80">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="mt-2 text-sm text-error underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Viewing Other Team Banner */}
      {isViewingOther && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-600 font-medium">
            Viewing {data.team.teamName}&apos;s keeper selections (read-only)
          </p>
        </div>
      )}

      {/* Conflicts Alert */}
      {!data.isFinalized && !isViewingOther && <ConflictAlert conflicts={data.conflicts} />}

      {/* Selected Keepers */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Selected Keepers ({data.selections.length})
            </h2>
            {isViewingOther && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                <Eye className="w-3 h-3 mr-1" />
                Viewing
              </Badge>
            )}
          </div>
          <SelectedKeepersTable
            selections={data.selections}
            totalRounds={data.season.totalRounds}
            isFinalized={isReadOnly}
            onRemove={handleRemovePlayer}
            onBump={handleBumpPlayer}
            getBumpOptions={getBumpOptions}
          />
        </CardContent>
      </Card>

      {/* Eligible Players */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Eligible Players
          </h2>
          <EligiblePlayersTable
            players={data.eligiblePlayers}
            canSelectMore={canSelectMore}
            isFinalized={isReadOnly}
            onSelect={handleSelectPlayer}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Deadline Banner Component
function DeadlineBanner({ deadlineInfo, isFinalized }: { deadlineInfo: DeadlineInfo; isFinalized: boolean }) {
  if (isFinalized) {
    return (
      <div className="p-3 bg-success/10 border border-success/20 rounded-md">
        <p className="text-sm text-success font-medium">
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
        <div className="p-3 bg-error/10 border border-error/20 rounded-md">
          <p className="text-sm text-error font-medium">
            Deadline has passed - selections are locked
          </p>
          <p className="text-xs text-error/70 mt-1">
            Deadline was: {deadlineDate}
          </p>
        </div>
      );

    case 'urgent':
      return (
        <div className="p-3 bg-error/10 border border-error/20 rounded-md animate-pulse">
          <p className="text-sm text-error font-medium">
            Less than 24 hours remaining!
          </p>
          <p className="text-xs text-error/70 mt-1">
            Deadline: {deadlineDate}
          </p>
        </div>
      );

    case 'approaching':
      return (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
          <p className="text-sm text-warning font-medium">
            Deadline approaching
          </p>
          <p className="text-xs text-warning/70 mt-1">
            Deadline: {deadlineDate}
          </p>
        </div>
      );

    case 'open':
    default:
      return (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
          <p className="text-sm text-primary">
            <span className="font-medium">Deadline:</span> {deadlineDate}
          </p>
        </div>
      );
  }
}
