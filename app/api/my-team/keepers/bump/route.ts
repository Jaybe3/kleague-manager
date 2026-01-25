import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bumpPlayer, getBumpOptions, canModifySelections } from "@/lib/keeper/selection-service";
import { getSlotForManager } from "@/lib/slots";

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

    // Get user's slot
    const slot = await getSlotForManager(session.user.id);
    if (!slot) {
      return NextResponse.json({ error: "No slot assigned to user" }, { status: 404 });
    }

    // Get active season to determine years (prevents cascade bug)
    const activeSeason = await db.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) {
      return NextResponse.json({ error: "No active season" }, { status: 404 });
    }

    const targetYear = activeSeason.year;  // Selecting keepers FOR this year
    const rosterYear = targetYear - 1;      // Roster we're selecting FROM

    // Get roster team
    const rosterTeam = await db.team.findFirst({
      where: { slotId: slot.id, seasonYear: rosterYear },
    });
    if (!rosterTeam) {
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    // Check if already finalized
    const existingSelections = await db.keeperSelection.findFirst({
      where: { teamId: rosterTeam.id, seasonYear: targetYear, isFinalized: true },
    });
    const isFinalized = !!existingSelections;

    // Check deadline
    if (!canModifySelections(activeSeason.keeperDeadline, isFinalized)) {
      return NextResponse.json(
        { error: "Cannot modify selections - deadline has passed or selections are finalized" },
        { status: 403 }
      );
    }

    const result = await bumpPlayer(rosterTeam.id, playerId, newRound, targetYear);

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

    // Get user's slot
    const slot = await getSlotForManager(session.user.id);
    if (!slot) {
      return NextResponse.json({ error: "No slot assigned to user" }, { status: 404 });
    }

    // Get active season to determine years (prevents cascade bug)
    const activeSeason = await db.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) {
      return NextResponse.json({ error: "No active season" }, { status: 404 });
    }

    const targetYear = activeSeason.year;  // Selecting keepers FOR this year
    const rosterYear = targetYear - 1;      // Roster we're selecting FROM

    // Get roster team
    const rosterTeam = await db.team.findFirst({
      where: { slotId: slot.id, seasonYear: rosterYear },
    });
    if (!rosterTeam) {
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    // Get bump options for target year
    const options = await getBumpOptions(rosterTeam.id, playerId, targetYear);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Error getting bump options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
