import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { removePlayer, canModifySelections } from "@/lib/keeper/selection-service";
import { getSlotForManager } from "@/lib/slots";

// DELETE - Remove a player from keeper selections
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playerId } = await params;

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

    const result = await removePlayer(rosterTeam.id, playerId, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
