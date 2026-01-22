import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DraftBoardResponse } from "@/lib/draft-board/types";
import {
  getOrCreateDraftOrder,
  getDraftOrderWithNames,
  getSeasonsWithDraftOrder,
} from "@/lib/slots/draft-order-service";

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

    // Combine and add next year
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const allSeasons = new Set([
      ...seasonsWithDraftOrder,
      ...teamSeasons,
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
      // Default to the latest available year
      targetYear = availableSeasons[0];
    }

    // Get target season info (may not exist if it's a future season)
    let season = await db.season.findUnique({
      where: { year: targetYear },
    });

    // If season doesn't exist in Season table, create a minimal object
    if (!season) {
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
            slotId: true,
          },
        },
      },
    });

    // Transform keeper selections to response format
    // Use slotId to match with teams since team.id may not exist for future years
    const keepers = keeperSelections.map((ks) => ({
      teamId: `slot-${ks.slotId ?? ks.team.slotId}`, // Use slotId if available, fallback to team.slotId
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
