import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTeamByManagerId,
  getTeamRosterWithKeeperCosts,
  getCurrentSeasonYear,
} from "@/lib/keeper";
import { RosterTable } from "@/components/roster/roster-table";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MyTeamPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Active season is what we're preparing for (e.g., 2026 draft)
  // Roster season is the previous season's end-of-year roster (e.g., 2025)
  const activeSeasonYear = await getCurrentSeasonYear();
  const rosterSeasonYear = activeSeasonYear - 1;
  const team = await getTeamByManagerId(session.user.id, rosterSeasonYear);

  // If no team assigned, show message
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

  // targetYear is what we calculate keeper costs for (the upcoming draft year)
  const roster = await getTeamRosterWithKeeperCosts(team.id, activeSeasonYear);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description="View your roster and keeper eligibility"
        actions={
          <Button asChild>
            <Link href="/my-team/keepers">Manage Keepers</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {/* Team Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {roster?.team.teamName ?? team.teamName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {rosterSeasonYear} Roster • {roster?.players.length ?? 0} Players • Keeper costs for {activeSeasonYear}
              </p>
            </div>
          </div>

          {/* Roster Table */}
          {roster && roster.players.length > 0 ? (
            <RosterTable players={roster.players} isCommissioner={session.user.isCommissioner} />
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
