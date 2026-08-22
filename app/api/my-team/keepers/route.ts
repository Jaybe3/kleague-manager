import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getSlotKeeperSelections,
  selectPlayer,
} from "@/lib/keeper/selection-service";
import { resolveKeeperEditContext } from "@/lib/keeper/edit-context";
import { getSlotForManager } from "@/lib/slots";
import { ensureTeamForSlot } from "@/lib/slots/team-initializer";

// GET - Get current keeper selections and eligible players
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for optional slotId query parameter (commissioner feature)
    const { searchParams } = new URL(request.url);
    const slotIdParam = searchParams.get("slotId");

    // Get active season to determine years (prevents cascade bug)
    const activeSeason = await db.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) {
      return NextResponse.json(
        { error: "No active season configured" },
        { status: 404 }
      );
    }

    const targetYear = activeSeason.year;  // Selecting keepers FOR this year
    const rosterYear = targetYear - 1;      // Roster we're selecting FROM

    let slotId: number;
    let isViewingOther = false;

    if (slotIdParam) {
      // Commissioner viewing another team's keepers
      if (!session.user.isCommissioner) {
        return NextResponse.json(
          { error: "Forbidden - Commissioner access required" },
          { status: 403 }
        );
      }

      const requestedSlotId = parseInt(slotIdParam, 10);
      if (isNaN(requestedSlotId) || requestedSlotId < 1 || requestedSlotId > 10) {
        return NextResponse.json(
          { error: "Invalid slotId - must be 1-10" },
          { status: 400 }
        );
      }

      slotId = requestedSlotId;

      // Check if this is a different slot than the user's own
      const userSlot = await getSlotForManager(session.user.id);
      isViewingOther = !userSlot || userSlot.id !== requestedSlotId;
    } else {
      // Default: user's own slot
      const userSlot = await getSlotForManager(session.user.id);
      if (!userSlot) {
        return NextResponse.json(
          { error: "No team slot assigned to this user" },
          { status: 404 }
        );
      }
      slotId = userSlot.id;
    }

    // Find team for the roster year
    const rosterTeam = await db.team.findFirst({
      where: { slotId, seasonYear: rosterYear },
    });

    if (!rosterTeam) {
      return NextResponse.json(
        { error: `No team found for slot ${slotId} in ${rosterYear} season - import draft data first` },
        { status: 404 }
      );
    }

    // Only ensure team for target year if NOT viewing another team
    // (Don't want to create teams when just viewing)
    if (!isViewingOther) {
      await ensureTeamForSlot(slotId, targetYear);
    }

    const result = await getSlotKeeperSelections(slotId, targetYear);

    if (!result) {
      return NextResponse.json(
        { error: "Could not load keeper selections" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      isViewingOther,
      isCommissioner: session.user.isCommissioner ?? false,
    });
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
    const body = await request.json();
    const { playerId, slotId: requestedSlotId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    const resolved = await resolveKeeperEditContext(requestedSlotId ?? null);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { rosterTeam, targetYear, slotId, isOverride } = resolved.context;

    // Ensure team exists for target year (enables keeper selection before draft import)
    await ensureTeamForSlot(slotId, targetYear);

    const result = await selectPlayer(rosterTeam.id, playerId, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ...result, isOverride });
  } catch (error) {
    console.error("Error selecting keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
