import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllPlayersWithKeeperStatus } from "@/lib/keeper";

// GET - League-wide list of every player on every roster, with keeper
// eligibility resolved for the target (keeper) year. Visible to any signed-in user.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    // Seasons that have rosters; the keeper (target) year for a roster is season + 1.
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });

    const activeSeason = await db.season.findFirst({
      where: { isActive: true },
      select: { year: true },
    });

    const currentYear = new Date().getFullYear();
    const targetYears = new Set<number>([
      ...seasonsWithTeams.map((s) => s.seasonYear + 1),
      activeSeason?.year ?? currentYear,
    ]);
    const availableSeasons = Array.from(targetYears).sort((a, b) => b - a);

    // Determine target (keeper) year
    let targetYear: number;
    if (yearParam) {
      targetYear = parseInt(yearParam, 10);
      if (isNaN(targetYear)) {
        return NextResponse.json(
          { error: "Invalid year parameter" },
          { status: 400 }
        );
      }
    } else {
      targetYear = activeSeason?.year ?? currentYear;
    }

    const rosterYear = targetYear - 1;
    const players = await getAllPlayersWithKeeperStatus(rosterYear, targetYear);

    // Distinct owners and positions for filter dropdowns
    const owners = Array.from(
      new Map(players.map((p) => [p.slotId, p.ownerTeamName])).entries()
    )
      .map(([slotId, teamName]) => ({ slotId, teamName }))
      .sort((a, b) => a.slotId - b.slotId);

    const positions = Array.from(new Set(players.map((p) => p.position))).sort();

    return NextResponse.json({
      targetYear,
      rosterYear,
      players,
      owners,
      positions,
      availableSeasons,
    });
  } catch (error) {
    console.error("Error fetching all players:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
