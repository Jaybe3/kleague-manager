import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  getTeamRosterWithKeeperCosts,
  getCurrentSeasonYear,
} from "@/lib/keeper";
import { getAllSlotsWithNames, getSlotForManager } from "@/lib/slots";
import { RosterTable } from "@/components/roster/roster-table";
import { TeamSelector } from "@/components/my-team/team-selector";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ slotId?: string }>;
}

export default async function MyTeamPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const slotIdParam = params.slotId;
  const isCommissioner = session.user.isCommissioner ?? false;

  // Active season is what we're preparing for (e.g., 2026 draft)
  // Roster season is the previous season's end-of-year roster (e.g., 2025)
  const activeSeasonYear = await getCurrentSeasonYear();
  const rosterSeasonYear = activeSeasonYear - 1;

  // Get user's own slot
  const userSlot = await getSlotForManager(session.user.id);
  const userSlotId = userSlot?.id ?? null;

  // Determine which slot to show
  let targetSlotId: number | null = null;
  let isViewingOther = false;

  if (slotIdParam && isCommissioner) {
    // Commissioner viewing another team
    const requestedSlotId = parseInt(slotIdParam, 10);
    if (!isNaN(requestedSlotId) && requestedSlotId >= 1 && requestedSlotId <= 10) {
      targetSlotId = requestedSlotId;
      isViewingOther = userSlotId !== requestedSlotId;
    }
  }

  // If no valid slotId param or not commissioner, use user's own slot
  if (targetSlotId === null) {
    targetSlotId = userSlotId;
  }

  // If still no slot (user not assigned), show error
  if (targetSlotId === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Team"
          description="View your roster and keeper eligibility"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="bg-warning/10 border border-warning/20 rounded-md p-4">
              <h2 className="text-warning font-semibold mb-2">
                No Team Assigned
              </h2>
              <p className="text-muted-foreground">
                You are not assigned to any team for the {rosterSeasonYear} season.
                Please contact the commissioner to be assigned to a team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find team for the target slot
  const team = await db.team.findFirst({
    where: {
      slotId: targetSlotId,
      seasonYear: rosterSeasonYear,
    },
    select: {
      id: true,
      teamName: true,
      slotId: true,
    },
  });

  if (!team) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Team"
          description="View your roster and keeper eligibility"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="bg-warning/10 border border-warning/20 rounded-md p-4">
              <h2 className="text-warning font-semibold mb-2">
                No Team Found
              </h2>
              <p className="text-muted-foreground">
                No team found for slot {targetSlotId} in the {rosterSeasonYear} season.
                Draft data may need to be imported.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get roster with keeper costs
  const roster = await getTeamRosterWithKeeperCosts(team.id, activeSeasonYear);

  // Get all teams for commissioner dropdown
  const allTeams = isCommissioner
    ? (await getAllSlotsWithNames()).map((s) => ({
        slotId: s.slotId,
        teamName: s.teamName,
      }))
    : [];

  // Build keepers link with slotId if viewing another team
  const keepersLink = isViewingOther
    ? `/my-team/keepers?slotId=${targetSlotId}`
    : "/my-team/keepers";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description="View your roster and keeper eligibility"
        actions={
          <div className="flex items-center gap-3">
            {isCommissioner && (
              <TeamSelector
                teams={allTeams}
                currentSlotId={targetSlotId}
                userSlotId={userSlotId}
                basePath="/my-team"
              />
            )}
            <Button asChild>
              <Link href={keepersLink}>Manage Keepers</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {/* Team Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {roster?.team.teamName ?? team.teamName}
                </h2>
                {isViewingOther && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Eye className="w-3 h-3 mr-1" />
                    Viewing
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {rosterSeasonYear} Roster • {roster?.players.length ?? 0} Players • Keeper costs for {activeSeasonYear}
              </p>
            </div>
          </div>

          {/* Roster Table */}
          {roster && roster.players.length > 0 ? (
            <RosterTable
              players={roster.players}
              isCommissioner={isCommissioner}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No players on roster yet.</p>
              <p className="text-sm mt-1">
                Players will appear here after draft data is imported.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
