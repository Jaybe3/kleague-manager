import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enterTrade, getTeamsForSeason, searchPlayers } from "@/lib/importers";

// POST - Enter a new trade
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

    const body = await request.json();
    const {
      playerMatchKey,
      playerFirstName,
      playerLastName,
      playerPosition,
      fromTeamName,
      toTeamName,
      tradeDate,
      seasonYear,
    } = body;

    // Validate required fields
    if (!playerMatchKey || !playerFirstName || !playerLastName) {
      return NextResponse.json(
        { error: "Player information is required" },
        { status: 400 }
      );
    }

    if (!fromTeamName || !toTeamName) {
      return NextResponse.json(
        { error: "Both from and to teams are required" },
        { status: 400 }
      );
    }

    if (!tradeDate || !seasonYear) {
      return NextResponse.json(
        { error: "Trade date and season year are required" },
        { status: 400 }
      );
    }

    const result = await enterTrade({
      playerMatchKey,
      playerFirstName,
      playerLastName,
      playerPosition: playerPosition || "UNKNOWN",
      fromTeamName,
      toTeamName,
      tradeDate: new Date(tradeDate),
      seasonYear: parseInt(seasonYear, 10),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tradeId: result.tradeId,
      message: `Trade recorded: ${playerFirstName} ${playerLastName} from ${fromTeamName} to ${toTeamName}`,
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
