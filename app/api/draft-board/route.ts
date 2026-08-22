import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DraftBoardResponse, DraftBoardKeeper } from "@/lib/draft-board/types";
import {
  getOrCreateDraftOrder,
  getDraftOrderWithNames,
  getSeasonsWithDraftOrder,
} from "@/lib/slots/draft-order-service";
import { getDeadlineState } from "@/lib/keeper/selection-service";

// GET - Get draft board data for a season
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    // Get seasons from DraftOrder table (includes future seasons)
    const seasonsWithDraftOrder = await getSeasonsWithDraftOrder();

    // Also get seasons with teams (for backwards compatibility)
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });
    const teamSeasons = seasonsWithTeams.map((s) => s.seasonYear + 1); // Draft board = teams + 1

    // Get active season if one exists
    const activeSeason = await db.season.findFirst({
      where: { isActive: true },
      select: { year: true },
    });

    // Combine: current year, next year, and all seasons with data
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const allSeasons = new Set([
      ...seasonsWithDraftOrder,
      ...teamSeasons,
      currentYear,
      nextYear,
    ]);
    const availableSeasons = Array.from(allSeasons).sort((a, b) => b - a);

    if (availableSeasons.length === 0) {
      return NextResponse.json(
        { error: "No seasons available. Import draft data first." },
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
      // Default to active season, or current year
      targetYear = activeSeason?.year ?? currentYear;
    }

    // Get target season info (may not exist if it's a future season)
    let season = await db.season.findUnique({
      where: { year: targetYear },
    });

    // If season doesn't exist in Season table, create a minimal object.
    // The keeper deadline is far future so an unconfigured season is never
    // treated as locked.
    if (!season) {
      season = {
        id: "future",
        year: targetYear,
        totalRounds: 28,
        draftDate: new Date(),
        keeperDeadline: new Date(targetYear + 1, 0, 1),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Get or create draft order for target year
    await getOrCreateDraftOrder(targetYear);

    // Get draft order with team names (uses TeamAlias for names)
    const draftOrderWithNames = await getDraftOrderWithNames(targetYear);

    // Transform to expected format
    const teams = draftOrderWithNames.map((order) => ({
      id: `slot-${order.slotId}`,
      teamName: order.teamName,
      slotId: order.slotId,
      draftPosition: order.position,
    }));

    // Which keeper selections count for the draft board?
    //
    // Before the deadline: only submitted ones, so the board reflects a
    // deliberate submission rather than a half-edited roster.
    //
    // After the deadline: everything on the roster counts, submitted or not.
    // The deadline is the lock - a manager who tweaked their keepers at the
    // last minute and never re-submitted still keeps them.
    const deadlinePassed = getDeadlineState(season.keeperDeadline) === 'passed';

    const keeperSelections = await db.keeperSelection.findMany({
      where: {
        seasonYear: targetYear,
        ...(deadlinePassed ? {} : { isFinalized: true }),
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
            slotId: true,
          },
        },
      },
    });

    // Transform keeper selections to response format
    // Use slotId to match with teams since team.id may not exist for future years
    const keepers: DraftBoardKeeper[] = keeperSelections.map((ks) => ({
      teamId: `slot-${ks.slotId ?? ks.team.slotId}`, // Use slotId if available, fallback to team.slotId
      playerId: ks.playerId,
      playerName: `${ks.player.firstName} ${ks.player.lastName}`,
      position: ks.player.position,
      keeperRound: ks.keeperRound,
    }));

    // Flag any team/round claimed by more than one keeper
    const roundCounts = new Map<string, number>();
    for (const k of keepers) {
      const key = `${k.teamId}:${k.keeperRound}`;
      roundCounts.set(key, (roundCounts.get(key) ?? 0) + 1);
    }
    for (const k of keepers) {
      if ((roundCounts.get(`${k.teamId}:${k.keeperRound}`) ?? 0) > 1) {
        k.hasConflict = true;
      }
    }

    const response: DraftBoardResponse = {
      season: {
        year: season.year,
        totalRounds: season.totalRounds,
      },
      teams,
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
