import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { finalizeSelections, getDeadlineState } from "@/lib/keeper/selection-service";

// POST - Finalize all keeper selections
export async function POST() {
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

    // Finalize selections for next year
    const targetYear = season.year + 1;

    // Get target season to check deadline
    const targetSeason = await db.season.findUnique({
      where: { year: targetYear },
    });

    if (!targetSeason) {
      return NextResponse.json({ error: "Target season not found" }, { status: 404 });
    }

    // Check deadline - cannot finalize after deadline passes
    if (getDeadlineState(targetSeason.keeperDeadline) === 'passed') {
      return NextResponse.json(
        { error: "Cannot finalize - deadline has passed" },
        { status: 403 }
      );
    }

    const result = await finalizeSelections(team.id, targetYear);

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
