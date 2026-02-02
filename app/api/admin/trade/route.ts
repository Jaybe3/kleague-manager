import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamsForSeason, searchPlayers } from "@/lib/importers";
import { db } from "@/lib/db";

interface TradeSideRequest {
  slotId: number;
  playerIds: string[];
}

interface MultiTradeRequest {
  teamA: TradeSideRequest;
  teamB: TradeSideRequest;
  tradeDate: string;
  seasonYear: number;
}

interface TradedPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  fromTeam: string;
  toTeam: string;
}

// POST - Enter a multi-player trade
export async function POST(request: Request) {
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

    const body: MultiTradeRequest = await request.json();
    const { teamA, teamB, tradeDate, seasonYear } = body;

    // Validate required fields
    if (!teamA?.slotId || !teamB?.slotId) {
      return NextResponse.json(
        { error: "Both teams must be specified with slotId" },
        { status: 400 }
      );
    }

    if (!teamA.playerIds?.length || !teamB.playerIds?.length) {
      return NextResponse.json(
        { error: "Both teams must have at least one player" },
        { status: 400 }
      );
    }

    if (!tradeDate || !seasonYear) {
      return NextResponse.json(
        { error: "Trade date and season year are required" },
        { status: 400 }
      );
    }

    const tradeDateObj = new Date(tradeDate);
    if (isNaN(tradeDateObj.getTime())) {
      return NextResponse.json(
        { error: "Invalid trade date format" },
        { status: 400 }
      );
    }

    // Look up both teams by slotId
    const [teamARecord, teamBRecord] = await Promise.all([
      db.team.findUnique({
        where: { slotId_seasonYear: { slotId: teamA.slotId, seasonYear } },
      }),
      db.team.findUnique({
        where: { slotId_seasonYear: { slotId: teamB.slotId, seasonYear } },
      }),
    ]);

    if (!teamARecord) {
      return NextResponse.json(
        { error: `Team not found for slot ${teamA.slotId} in ${seasonYear}` },
        { status: 400 }
      );
    }

    if (!teamBRecord) {
      return NextResponse.json(
        { error: `Team not found for slot ${teamB.slotId} in ${seasonYear}` },
        { status: 400 }
      );
    }

    // Validate all players exist and are on the correct teams
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      db.playerAcquisition.findMany({
        where: {
          playerId: { in: teamA.playerIds },
          teamId: teamARecord.id,
          droppedDate: null,
        },
        include: { player: true },
      }),
      db.playerAcquisition.findMany({
        where: {
          playerId: { in: teamB.playerIds },
          teamId: teamBRecord.id,
          droppedDate: null,
        },
        include: { player: true },
      }),
    ]);

    // Check for missing players
    const foundTeamAIds = new Set(teamAPlayers.map((a) => a.playerId));
    const missingTeamAIds = teamA.playerIds.filter((id) => !foundTeamAIds.has(id));
    if (missingTeamAIds.length > 0) {
      return NextResponse.json(
        { error: `Players not found on ${teamARecord.teamName}'s roster: ${missingTeamAIds.join(", ")}` },
        { status: 400 }
      );
    }

    const foundTeamBIds = new Set(teamBPlayers.map((a) => a.playerId));
    const missingTeamBIds = teamB.playerIds.filter((id) => !foundTeamBIds.has(id));
    if (missingTeamBIds.length > 0) {
      return NextResponse.json(
        { error: `Players not found on ${teamBRecord.teamName}'s roster: ${missingTeamBIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Execute trade in a transaction
    const tradedPlayers: TradedPlayer[] = [];

    await db.$transaction(async (tx) => {
      // Process Team A players → Team B
      for (const acq of teamAPlayers) {
        // Close current acquisition
        await tx.playerAcquisition.update({
          where: { id: acq.id },
          data: { droppedDate: tradeDateObj },
        });

        // Create TRADE acquisition on Team B
        await tx.playerAcquisition.create({
          data: {
            playerId: acq.playerId,
            teamId: teamBRecord.id,
            seasonYear,
            acquisitionType: "TRADE",
            draftRound: acq.draftRound, // Inherit original draft cost
            draftPick: acq.draftPick,
            acquisitionDate: tradeDateObj,
            tradedFromTeamId: teamARecord.id,
          },
        });

        tradedPlayers.push({
          playerId: acq.playerId,
          firstName: acq.player.firstName,
          lastName: acq.player.lastName,
          position: acq.player.position,
          fromTeam: teamARecord.teamName,
          toTeam: teamBRecord.teamName,
        });
      }

      // Process Team B players → Team A
      for (const acq of teamBPlayers) {
        // Close current acquisition
        await tx.playerAcquisition.update({
          where: { id: acq.id },
          data: { droppedDate: tradeDateObj },
        });

        // Create TRADE acquisition on Team A
        await tx.playerAcquisition.create({
          data: {
            playerId: acq.playerId,
            teamId: teamARecord.id,
            seasonYear,
            acquisitionType: "TRADE",
            draftRound: acq.draftRound, // Inherit original draft cost
            draftPick: acq.draftPick,
            acquisitionDate: tradeDateObj,
            tradedFromTeamId: teamBRecord.id,
          },
        });

        tradedPlayers.push({
          playerId: acq.playerId,
          firstName: acq.player.firstName,
          lastName: acq.player.lastName,
          position: acq.player.position,
          fromTeam: teamBRecord.teamName,
          toTeam: teamARecord.teamName,
        });
      }
    });

    // Build summary message
    const teamASends = tradedPlayers
      .filter((p) => p.fromTeam === teamARecord.teamName)
      .map((p) => `${p.firstName} ${p.lastName}`)
      .join(", ");
    const teamBSends = tradedPlayers
      .filter((p) => p.fromTeam === teamBRecord.teamName)
      .map((p) => `${p.firstName} ${p.lastName}`)
      .join(", ");

    return NextResponse.json({
      success: true,
      message: `Trade recorded: ${teamARecord.teamName} sends ${teamASends} to ${teamBRecord.teamName} for ${teamBSends}`,
      tradedPlayers,
      summary: {
        teamA: {
          teamName: teamARecord.teamName,
          sent: teamA.playerIds.length,
          received: teamB.playerIds.length,
        },
        teamB: {
          teamName: teamBRecord.teamName,
          sent: teamB.playerIds.length,
          received: teamA.playerIds.length,
        },
      },
    });
  } catch (error) {
    console.error("Trade entry error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get teams for dropdown or search players
export async function GET(request: Request) {
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
    const action = searchParams.get("action");
    const seasonYear = searchParams.get("seasonYear");
    const query = searchParams.get("query");

    if (action === "teams" && seasonYear) {
      const teams = await getTeamsForSeason(parseInt(seasonYear, 10));
      return NextResponse.json({ teams });
    }

    if (action === "players" && query) {
      const players = await searchPlayers(query);
      return NextResponse.json({ players });
    }

    return NextResponse.json({
      error: "Invalid request. Use action=teams&seasonYear=YYYY or action=players&query=NAME",
    }, { status: 400 });
  } catch (error) {
    console.error("Trade API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
