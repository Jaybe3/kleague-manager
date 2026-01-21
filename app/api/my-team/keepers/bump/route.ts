import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bumpPlayer, getBumpOptions, canModifySelections } from "@/lib/keeper/selection-service";

// POST - Bump a player to an earlier round
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, newRound } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    if (typeof newRound !== "number") {
      return NextResponse.json(
        { error: "newRound must be a number" },
        { status: 400 }
      );
    }

    // Find user's most recent team
    const team = await db.team.findFirst({
      where: {
        managerId: session.user.id,
      },
      orderBy: { seasonYear: "desc" },
    });

    if (!team) {
      return NextResponse.json(
        { error: "No team found for this user" },
        { status: 404 }
      );
    }

    // Bump player for next year
    const targetYear = team.seasonYear + 1;

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

    const result = await bumpPlayer(team.id, playerId, newRound, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error bumping keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get available bump options for a player
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId query param is required" },
        { status: 400 }
      );
    }

    // Find user's most recent team
    const team = await db.team.findFirst({
      where: {
        managerId: session.user.id,
      },
      orderBy: { seasonYear: "desc" },
    });

    if (!team) {
      return NextResponse.json(
        { error: "No team found for this user" },
        { status: 404 }
      );
    }

    // Get bump options for next year
    const targetYear = team.seasonYear + 1;
    const options = await getBumpOptions(team.id, playerId, targetYear);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Error getting bump options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
