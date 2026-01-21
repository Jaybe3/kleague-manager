import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List all keeper overrides for a season
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

    // Get all seasons that have teams (for dropdown)
    // Keeper overrides are for NEXT year, so available years = team years + 1
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });

    const availableSeasons = seasonsWithTeams.map((s) => s.seasonYear + 1);

    if (availableSeasons.length === 0) {
      return NextResponse.json({
        error: "No seasons with teams found. Import draft data first.",
        availableSeasons: [],
        overrides: [],
        teams: [],
        seasonYear: null,
      });
    }

    // Determine which season to fetch
    let seasonYear: number;
    if (yearParam) {
      seasonYear = parseInt(yearParam, 10);
      if (isNaN(seasonYear)) {
        return NextResponse.json(
          { error: "Invalid year parameter", availableSeasons },
          { status: 400 }
        );
      }
    } else {
      // Default to the most recent keeper season
      seasonYear = availableSeasons[0];
    }

    // Get all teams for the previous season (for the dropdown when adding overrides)
    const previousYear = seasonYear - 1;
    const teams = await db.team.findMany({
      where: { seasonYear: previousYear },
      orderBy: { teamName: "asc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
      },
    });

    // If no teams found for the previous year, return with error but include availableSeasons
    if (teams.length === 0) {
      return NextResponse.json({
        seasonYear,
        overrides: [],
        teams: [],
        availableSeasons,
        error: `No teams found for ${previousYear} season. Select a different year.`,
      });
    }

    // Get all overrides for this season
    const overrides = await db.keeperOverride.findMany({
      where: { seasonYear },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        team: {
          select: {
            id: true,
            teamName: true,
            slotId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      seasonYear,
      overrides,
      teams,
      availableSeasons,
    });
  } catch (error) {
    console.error("Error fetching keeper overrides:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new keeper override
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { playerId, teamId, seasonYear, overrideRound } = body;

    // Validate required fields
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    if (!seasonYear || typeof seasonYear !== "number") {
      return NextResponse.json(
        { error: "seasonYear is required and must be a number" },
        { status: 400 }
      );
    }

    if (!overrideRound || typeof overrideRound !== "number") {
      return NextResponse.json(
        { error: "overrideRound is required and must be a number" },
        { status: 400 }
      );
    }

    if (overrideRound < 1 || overrideRound > 28) {
      return NextResponse.json(
        { error: "overrideRound must be between 1 and 28" },
        { status: 400 }
      );
    }

    // Verify player exists
    const player = await db.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Verify team exists
    const team = await db.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if override already exists for this player/team/season
    const existingOverride = await db.keeperOverride.findUnique({
      where: {
        playerId_teamId_seasonYear: {
          playerId,
          teamId,
          seasonYear,
        },
      },
    });

    if (existingOverride) {
      return NextResponse.json(
        { error: "Override already exists for this player/team/season" },
        { status: 409 }
      );
    }

    // Create the override
    const override = await db.keeperOverride.create({
      data: {
        playerId,
        teamId,
        seasonYear,
        overrideRound,
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        team: {
          select: {
            id: true,
            teamName: true,
            slotId: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      override,
    });
  } catch (error) {
    console.error("Error creating keeper override:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
