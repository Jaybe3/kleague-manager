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

    // Find all seasons that have teams (draft board year = team year + 1)
    // Teams are stored by the year they played, draft board shows keepers for NEXT year
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });

    // Available draft board years = team years + 1
    const availableSeasons = seasonsWithTeams.map((s) => s.seasonYear + 1);

    if (availableSeasons.length === 0) {
      return NextResponse.json(
        { error: "No seasons with teams found. Import draft data first." },
        { status: 404 }
      );
    }

    // Determine target year
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
      // Default to the latest draft board year that has team data
      targetYear = availableSeasons[0];
    }

    // Get target season info (may not exist if it's a future season)
    let season = await db.season.findUnique({
      where: { year: targetYear },
    });

    // If season doesn't exist in Season table, create a minimal object
    // (Draft board can show even if Season record doesn't exist yet)
    const previousYear = targetYear - 1;
    if (!season) {
      // Use default values for future seasons
      season = {
        id: "future",
        year: targetYear,
        totalRounds: 28,
        draftDate: new Date(),
        keeperDeadline: new Date(),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Get all teams from the previous season (they hold next year's keepers)
    const teams = await db.team.findMany({
      where: { seasonYear: previousYear },
      orderBy: { draftPosition: "asc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
        draftPosition: true,
      },
    });

    if (teams.length === 0) {
      return NextResponse.json({
        season: { year: targetYear, totalRounds: season.totalRounds },
        teams: [],
        keepers: [],
        availableSeasons,
        error: `No teams found for season ${previousYear}`,
      });
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
        draftPosition: t.draftPosition,
      })),
      keepers,
      availableSeasons,
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
