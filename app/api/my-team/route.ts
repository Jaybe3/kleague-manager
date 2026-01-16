import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTeamByManagerId,
  getTeamRosterWithKeepers,
  getCurrentSeasonYear,
} from "@/lib/keepers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seasonYear = await getCurrentSeasonYear();

    // Find the team managed by this user
    const team = await getTeamByManagerId(session.user.id, seasonYear);

    if (!team) {
      return NextResponse.json(
        {
          error: "No team found",
          message: "You are not assigned to any team for this season. Contact the commissioner.",
          seasonYear,
        },
        { status: 404 }
      );
    }

    // Get full roster with keeper costs
    const roster = await getTeamRosterWithKeepers(team.id, seasonYear);

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching my team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
