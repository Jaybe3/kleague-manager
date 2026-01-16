import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getTeamKeeperSelections,
  selectPlayer,
  canModifySelections,
} from "@/lib/keeper/selection-service";

// GET - Get current keeper selections and eligible players
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current season
    const season = await db.season.findFirst({
      where: { isActive: true },
      orderBy: { year: "desc" },
    });

    if (!season) {
      return NextResponse.json({ error: "No active season" }, { status: 404 });
    }

    // Find user's team
    const team = await db.team.findFirst({
      where: {
        managerId: session.user.id,
        seasonYear: season.year,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "No team found for this user" },
        { status: 404 }
      );
    }

    // Get keeper selections for next year
    const targetYear = season.year + 1;
    const result = await getTeamKeeperSelections(team.id, targetYear);

    if (!result) {
      return NextResponse.json(
        { error: "Could not load keeper selections" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching keeper selections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add a player to keeper selections
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    // Get current season
    const season = await db.season.findFirst({
      where: { isActive: true },
      orderBy: { year: "desc" },
    });

    if (!season) {
      return NextResponse.json({ error: "No active season" }, { status: 404 });
    }

    // Find user's team
    const team = await db.team.findFirst({
      where: {
        managerId: session.user.id,
        seasonYear: season.year,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "No team found for this user" },
        { status: 404 }
      );
    }

    // Select player for next year
    const targetYear = season.year + 1;

    // Get target season to check deadline
    const targetSeason = await db.season.findUnique({
      where: { year: targetYear },
    });

    if (!targetSeason) {
      return NextResponse.json({ error: "Target season not found" }, { status: 404 });
    }

    // Check if already finalized
    const existingSelections = await db.keeperSelection.findFirst({
      where: { teamId: team.id, seasonYear: targetYear, isFinalized: true },
    });
    const isFinalized = !!existingSelections;

    // Check deadline
    if (!canModifySelections(targetSeason.keeperDeadline, isFinalized)) {
      return NextResponse.json(
        { error: "Cannot modify selections - deadline has passed or selections are finalized" },
        { status: 403 }
      );
    }

    const result = await selectPlayer(team.id, playerId, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error selecting keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
