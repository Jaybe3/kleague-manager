import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { finalizeSelections, getDeadlineState } from "@/lib/keeper/selection-service";
import { getSlotForManager } from "@/lib/slots";

// POST - Finalize all keeper selections
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check deadline - cannot finalize after deadline passes
    if (getDeadlineState(activeSeason.keeperDeadline) === 'passed') {
      return NextResponse.json(
        { error: "Cannot finalize - deadline has passed" },
        { status: 403 }
      );
    }

    const result = await finalizeSelections(rosterTeam.id, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error finalizing keepers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
