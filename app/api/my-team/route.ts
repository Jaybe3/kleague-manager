import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getTeamByManagerId,
  getTeamRosterWithKeeperCosts,
  getCurrentSeasonYear,
} from "@/lib/keeper";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for optional slotId query parameter (commissioner feature)
    const { searchParams } = new URL(request.url);
    const slotIdParam = searchParams.get("slotId");

    // Active season is what we're preparing for (e.g., 2026 draft)
    // Roster season is the previous season's end-of-year roster (e.g., 2025)
    const activeSeasonYear = await getCurrentSeasonYear();
    const rosterSeasonYear = activeSeasonYear - 1;

    let team: { id: string; teamName: string; slotId: number } | null = null;
    let isViewingOther = false;

    if (slotIdParam) {
      // Commissioner viewing another team
      if (!session.user.isCommissioner) {
        return NextResponse.json(
          { error: "Forbidden - Commissioner access required" },
          { status: 403 }
        );
      }

      const requestedSlotId = parseInt(slotIdParam, 10);
      if (isNaN(requestedSlotId) || requestedSlotId < 1 || requestedSlotId > 10) {
        return NextResponse.json(
          { error: "Invalid slotId - must be 1-10" },
          { status: 400 }
        );
      }

      // Find team for the requested slot
      team = await db.team.findFirst({
        where: {
          slotId: requestedSlotId,
          seasonYear: rosterSeasonYear,
        },
        select: {
          id: true,
          teamName: true,
          slotId: true,
        },
      });

      if (!team) {
        return NextResponse.json(
          {
            error: "No team found",
            message: `No team found for slot ${requestedSlotId} in ${rosterSeasonYear} season.`,
            rosterSeasonYear,
            activeSeasonYear,
          },
          { status: 404 }
        );
      }

      // Check if this is a different team than the user's own
      const userTeam = await getTeamByManagerId(session.user.id, rosterSeasonYear);
      isViewingOther = !userTeam || userTeam.slotId !== requestedSlotId;
    } else {
      // Default: user's own team
      team = await getTeamByManagerId(session.user.id, rosterSeasonYear);

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
    }

    // Get full roster with keeper costs (costs calculated for activeSeasonYear)
    const roster = await getTeamRosterWithKeeperCosts(team.id, activeSeasonYear);

    return NextResponse.json({
      ...roster,
      activeSeasonYear,
      rosterSeasonYear,
      isViewingOther,
      isCommissioner: session.user.isCommissioner ?? false,
    });
  } catch (error) {
    console.error("Error fetching my team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
