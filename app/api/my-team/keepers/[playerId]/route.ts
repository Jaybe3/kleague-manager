import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { removePlayer, canModifySelections } from "@/lib/keeper/selection-service";

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

    // Remove player for next year
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

    const result = await removePlayer(team.id, playerId, targetYear);

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
