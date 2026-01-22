import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrCreateDraftOrder,
  getDraftOrderWithNames,
  updateDraftOrder,
  getSeasonsWithDraftOrder,
} from "@/lib/slots/draft-order-service";
import { db } from "@/lib/db";

interface DraftOrderEntry {
  slotId: number;
  draftPosition: number;
}

interface PutRequestBody {
  seasonYear: number;
  draftOrder: DraftOrderEntry[];
}

// GET - Get draft order for a season (uses DraftOrder table)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    // Get seasons with draft order (from DraftOrder table)
    const seasonsWithDraftOrder = await getSeasonsWithDraftOrder();

    // Also get seasons with teams (for backwards compatibility and UI)
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });
    const teamSeasons = seasonsWithTeams.map((s) => s.seasonYear);

    // Combine: All seasons that have draft order OR teams, plus next year
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const allSeasons = new Set([
      ...seasonsWithDraftOrder,
      ...teamSeasons,
      nextYear, // Always include next year for future planning
    ]);
    const availableSeasons = Array.from(allSeasons).sort((a, b) => b - a);

    // Determine which season to fetch
    let seasonYear: number;
    if (yearParam) {
      seasonYear = parseInt(yearParam, 10);
      if (isNaN(seasonYear)) {
        return NextResponse.json(
          { error: "Invalid year parameter" },
          { status: 400 }
        );
      }
    } else {
      // Default to next year (most useful for planning)
      seasonYear = nextYear;
    }

    // Get or create draft order for this season
    // This will auto-create from previous season if needed
    await getOrCreateDraftOrder(seasonYear);

    // Get draft order with team names
    const draftOrderWithNames = await getDraftOrderWithNames(seasonYear);

    // Transform to expected format
    const teams = draftOrderWithNames.map((order) => ({
      id: `slot-${order.slotId}`, // Use slot-based ID since we may not have teams
      teamName: order.teamName,
      slotId: order.slotId,
      draftPosition: order.position,
      seasonYear,
    }));

    return NextResponse.json({
      seasonYear,
      teams,
      availableSeasons,
    });
  } catch (error) {
    console.error("Error fetching draft order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update draft order for a season (uses DraftOrder table)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const body: PutRequestBody = await request.json();
    const { seasonYear, draftOrder } = body;

    // Validate seasonYear
    if (!seasonYear || typeof seasonYear !== "number") {
      return NextResponse.json(
        { error: "seasonYear is required and must be a number" },
        { status: 400 }
      );
    }

    // Validate draftOrder array
    if (!Array.isArray(draftOrder) || draftOrder.length !== 10) {
      return NextResponse.json(
        { error: "draftOrder must be an array of exactly 10 entries" },
        { status: 400 }
      );
    }

    // Validate each entry has slotId and draftPosition
    for (const entry of draftOrder) {
      if (typeof entry.slotId !== "number" || typeof entry.draftPosition !== "number") {
        return NextResponse.json(
          { error: "Each entry must have slotId and draftPosition as numbers" },
          { status: 400 }
        );
      }
      if (entry.draftPosition < 1 || entry.draftPosition > 10) {
        return NextResponse.json(
          { error: "draftPosition must be between 1 and 10" },
          { status: 400 }
        );
      }
    }

    // Validate no duplicate positions
    const positions = draftOrder.map((e) => e.draftPosition);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== 10) {
      return NextResponse.json(
        { error: "Each draft position (1-10) must be used exactly once" },
        { status: 400 }
      );
    }

    // Validate all positions 1-10 are present
    for (let i = 1; i <= 10; i++) {
      if (!uniquePositions.has(i)) {
        return NextResponse.json(
          { error: `Missing draft position ${i}` },
          { status: 400 }
        );
      }
    }

    // Validate all slotIds are valid (1-10 and exist in TeamSlot)
    const slots = await db.teamSlot.findMany({
      select: { id: true },
    });
    const validSlotIds = new Set(slots.map((s) => s.id));

    for (const entry of draftOrder) {
      if (!validSlotIds.has(entry.slotId)) {
        return NextResponse.json(
          { error: `Invalid slotId ${entry.slotId}` },
          { status: 400 }
        );
      }
    }

    // Update DraftOrder table
    const entries = draftOrder.map((e) => ({
      slotId: e.slotId,
      position: e.draftPosition,
    }));
    await updateDraftOrder(seasonYear, entries);

    // Also update Team.draftPosition if teams exist for this season (backwards compatibility)
    const teamsForSeason = await db.team.findMany({
      where: { seasonYear },
      select: { id: true, slotId: true },
    });

    if (teamsForSeason.length > 0) {
      const slotToTeamId = new Map<number, string>();
      for (const team of teamsForSeason) {
        slotToTeamId.set(team.slotId, team.id);
      }

      // Update Team.draftPosition for existing teams
      await db.$transaction(
        draftOrder
          .filter((entry) => slotToTeamId.has(entry.slotId))
          .map((entry) => {
            const teamId = slotToTeamId.get(entry.slotId)!;
            return db.team.update({
              where: { id: teamId },
              data: { draftPosition: entry.draftPosition },
            });
          })
      );
    }

    // Fetch updated draft order with names
    const updatedOrder = await getDraftOrderWithNames(seasonYear);

    const teams = updatedOrder.map((order) => ({
      id: `slot-${order.slotId}`,
      teamName: order.teamName,
      slotId: order.slotId,
      draftPosition: order.position,
      seasonYear,
    }));

    return NextResponse.json({
      success: true,
      seasonYear,
      teams,
    });
  } catch (error) {
    console.error("Error updating draft order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
