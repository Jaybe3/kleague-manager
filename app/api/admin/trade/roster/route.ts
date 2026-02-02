import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlayerKeeperCost } from "@/lib/keeper/service";

/**
 * GET /api/admin/trade/roster
 *
 * Get players on a team's roster for trade entry autocomplete.
 *
 * Query params:
 * - slotId: Team slot ID (1-10) - required
 * - seasonYear: Season year - required
 * - query: Optional search filter (matches first/last name)
 *
 * Returns:
 * - players: Array of { id, firstName, lastName, position, keeperCost }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slotIdParam = searchParams.get("slotId");
    const seasonYearParam = searchParams.get("seasonYear");
    const query = searchParams.get("query")?.trim().toLowerCase();

    // Validate required params
    if (!slotIdParam || !seasonYearParam) {
      return NextResponse.json(
        { error: "slotId and seasonYear are required" },
        { status: 400 }
      );
    }

    const slotId = parseInt(slotIdParam, 10);
    const seasonYear = parseInt(seasonYearParam, 10);

    if (isNaN(slotId) || slotId < 1 || slotId > 10) {
      return NextResponse.json(
        { error: "Invalid slotId - must be 1-10" },
        { status: 400 }
      );
    }

    if (isNaN(seasonYear) || seasonYear < 2020 || seasonYear > 2030) {
      return NextResponse.json(
        { error: "Invalid seasonYear" },
        { status: 400 }
      );
    }

    // Find team for this slot and season
    const team = await db.team.findUnique({
      where: {
        slotId_seasonYear: {
          slotId,
          seasonYear,
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: `No team found for slot ${slotId} in ${seasonYear}` },
        { status: 404 }
      );
    }

    // Get all active acquisitions for this team (not dropped)
    const acquisitions = await db.playerAcquisition.findMany({
      where: {
        teamId: team.id,
        droppedDate: null,
      },
      include: {
        player: true,
      },
      orderBy: {
        player: {
          lastName: "asc",
        },
      },
    });

    // Filter by query if provided
    let filteredAcquisitions = acquisitions;
    if (query) {
      filteredAcquisitions = acquisitions.filter((acq) => {
        const firstName = acq.player.firstName.toLowerCase();
        const lastName = acq.player.lastName.toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query)
        );
      });
    }

    // Build response with keeper costs
    // Note: We're calculating keeper costs for the NEXT season (keepering FROM this roster)
    const targetYear = seasonYear + 1;

    const players = await Promise.all(
      filteredAcquisitions.map(async (acq) => {
        // Get keeper cost for this player
        const keeperResult = await getPlayerKeeperCost(
          acq.playerId,
          slotId,
          targetYear
        );

        // Handle case where keeper calculation fails
        const isEligible = keeperResult?.calculation?.isEligible ?? false;
        const keeperCost = isEligible
          ? keeperResult?.calculation?.keeperRound ?? null
          : null;

        return {
          id: acq.player.id,
          firstName: acq.player.firstName,
          lastName: acq.player.lastName,
          position: acq.player.position,
          playerMatchKey: acq.player.playerMatchKey,
          keeperCost,
          isKeeperEligible: isEligible,
          acquisitionType: acq.acquisitionType,
          draftRound: acq.draftRound,
        };
      })
    );

    return NextResponse.json({
      slotId,
      seasonYear,
      teamName: team.teamName,
      players,
    });
  } catch (error) {
    console.error("Roster search error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
