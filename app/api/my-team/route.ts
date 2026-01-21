import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTeamByManagerId,
  getTeamRosterWithKeeperCosts,
  getCurrentSeasonYear,
} from "@/lib/keeper";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Active season is what we're preparing for (e.g., 2026 draft)
    // Roster season is the previous season's end-of-year roster (e.g., 2025)
    const activeSeasonYear = await getCurrentSeasonYear();
    const rosterSeasonYear = activeSeasonYear - 1;

    // Find the team managed by this user for the roster season
    const team = await getTeamByManagerId(session.user.id, rosterSeasonYear);

    if (!team) {
      return NextResponse.json(
        {
          error: "No team found",
          message: `You are not assigned to any team for the ${rosterSeasonYear} season. Contact the commissioner.`,
          rosterSeasonYear,
          activeSeasonYear,
        },
        { status: 404 }
      );
    }

    // Get full roster with keeper costs (costs calculated for activeSeasonYear)
    const roster = await getTeamRosterWithKeeperCosts(team.id, activeSeasonYear);

    return NextResponse.json({ ...roster, activeSeasonYear, rosterSeasonYear });
  } catch (error) {
    console.error("Error fetching my team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
