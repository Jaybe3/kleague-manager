import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface DraftOrderEntry {
  slotId: number;
  draftPosition: number;
}

interface PutRequestBody {
  seasonYear: number;
  draftOrder: DraftOrderEntry[];
}

// GET - Get teams with current draft positions for a season
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
    const seasonsWithTeams = await db.team.groupBy({
      by: ["seasonYear"],
      orderBy: { seasonYear: "desc" },
    });

    const availableSeasons = seasonsWithTeams.map((s) => s.seasonYear);

    if (availableSeasons.length === 0) {
      return NextResponse.json(
        { error: "No seasons with teams found. Import draft data first." },
        { status: 404 }
      );
    }

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
      // Default to the most recent season that has teams
      seasonYear = availableSeasons[0];
    }

    // Get all teams for this season
    const teams = await db.team.findMany({
      where: { seasonYear },
      orderBy: { draftPosition: "asc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
        draftPosition: true,
        seasonYear: true,
      },
    });

    // Handle case where requested season has no teams
    if (teams.length === 0) {
      return NextResponse.json({
        seasonYear,
        teams: [],
        availableSeasons,
        error: `No teams found for season ${seasonYear}`,
      });
    }

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

// PUT - Update draft positions for a season
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

    // Get teams for the season to verify they exist
    const teams = await db.team.findMany({
      where: { seasonYear },
      select: { id: true, slotId: true },
    });

    if (teams.length !== 10) {
      return NextResponse.json(
        { error: `Expected 10 teams for season ${seasonYear}, found ${teams.length}` },
        { status: 400 }
      );
    }

    // Create a map of slotId -> teamId
    const slotToTeamId = new Map<number, string>();
    for (const team of teams) {
      slotToTeamId.set(team.slotId, team.id);
    }

    // Validate all slotIds in draftOrder correspond to existing teams
    for (const entry of draftOrder) {
      if (!slotToTeamId.has(entry.slotId)) {
        return NextResponse.json(
          { error: `No team found with slotId ${entry.slotId} for season ${seasonYear}` },
          { status: 400 }
        );
      }
    }

    // Update all teams in a transaction
    await db.$transaction(
      draftOrder.map((entry) => {
        const teamId = slotToTeamId.get(entry.slotId)!;
        return db.team.update({
          where: { id: teamId },
          data: { draftPosition: entry.draftPosition },
        });
      })
    );

    // Fetch updated teams
    const updatedTeams = await db.team.findMany({
      where: { seasonYear },
      orderBy: { draftPosition: "asc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
        draftPosition: true,
        seasonYear: true,
      },
    });

    return NextResponse.json({
      success: true,
      seasonYear,
      teams: updatedTeams,
    });
  } catch (error) {
    console.error("Error updating draft order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
