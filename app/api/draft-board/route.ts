import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DraftBoardResponse } from "@/lib/draft-board/types";

// GET - Get draft board data for a season
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    // Default to next year (keeper selections are for upcoming season)
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
      // Get current active season and add 1
      const activeSeason = await db.season.findFirst({
        where: { isActive: true },
        orderBy: { year: "desc" },
      });
      targetYear = activeSeason ? activeSeason.year + 1 : new Date().getFullYear() + 1;
    }

    // Get target season info
    const season = await db.season.findUnique({
      where: { year: targetYear },
    });

    if (!season) {
      return NextResponse.json(
        { error: `Season ${targetYear} not found` },
        { status: 404 }
      );
    }

    // Get all teams for this season
    // Teams are stored per season, so we get teams from the previous season
    // (the season where players were acquired)
    const previousYear = targetYear - 1;
    const teams = await db.team.findMany({
      where: { seasonYear: previousYear },
      orderBy: { slotId: "asc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
      },
    });

    if (teams.length === 0) {
      return NextResponse.json(
        { error: `No teams found for season ${previousYear}` },
        { status: 404 }
      );
    }

    // Get all finalized keeper selections for the target season
    const keeperSelections = await db.keeperSelection.findMany({
      where: {
        seasonYear: targetYear,
        isFinalized: true,
      },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        team: {
          select: {
            id: true,
          },
        },
      },
    });

    // Transform keeper selections to response format
    const keepers = keeperSelections.map((ks) => ({
      teamId: ks.teamId,
      playerId: ks.playerId,
      playerName: `${ks.player.firstName} ${ks.player.lastName}`,
      position: ks.player.position,
      keeperRound: ks.keeperRound,
    }));

    const response: DraftBoardResponse = {
      season: {
        year: season.year,
        totalRounds: season.totalRounds,
      },
      teams: teams.map((t) => ({
        id: t.id,
        teamName: t.teamName,
        slotId: t.slotId,
      })),
      keepers,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching draft board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
