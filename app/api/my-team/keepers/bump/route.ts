import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bumpPlayer, getBumpOptions, resetBump } from "@/lib/keeper/selection-service";
import { resolveKeeperEditContext } from "@/lib/keeper/edit-context";
import { getSlotForManager } from "@/lib/slots";

// POST - Bump a player to an earlier round
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, newRound, slotId: requestedSlotId } = body;

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

    const resolved = await resolveKeeperEditContext(requestedSlotId ?? null);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { rosterTeam, targetYear, isOverride } = resolved.context;

    const result = await bumpPlayer(rosterTeam.id, playerId, newRound, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ...result, isOverride });
  } catch (error) {
    console.error("Error bumping keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Reset a player's bump back to their original (calculated) round
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");
    const slotIdParam = searchParams.get("slotId");

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId query param is required" },
        { status: 400 }
      );
    }

    const resolved = await resolveKeeperEditContext(
      slotIdParam ? parseInt(slotIdParam, 10) : null
    );
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { rosterTeam, targetYear, isOverride } = resolved.context;

    const result = await resetBump(rosterTeam.id, playerId, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ...result, isOverride });
  } catch (error) {
    console.error("Error resetting keeper bump:", error);
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
    const slotIdParam = searchParams.get("slotId");

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId query param is required" },
        { status: 400 }
      );
    }

    // Resolve which slot's options to read. Reading another team's options is
    // commissioner-only, matching the edit rules.
    let slotId: number;
    if (slotIdParam) {
      const requestedSlotId = parseInt(slotIdParam, 10);
      if (isNaN(requestedSlotId) || requestedSlotId < 1 || requestedSlotId > 10) {
        return NextResponse.json({ error: "Invalid slotId - must be 1-10" }, { status: 400 });
      }
      const ownSlot = await getSlotForManager(session.user.id);
      if (ownSlot?.id !== requestedSlotId && !session.user.isCommissioner) {
        return NextResponse.json(
          { error: "Forbidden - Commissioner access required" },
          { status: 403 }
        );
      }
      slotId = requestedSlotId;
    } else {
      const ownSlot = await getSlotForManager(session.user.id);
      if (!ownSlot) {
        return NextResponse.json({ error: "No slot assigned to user" }, { status: 404 });
      }
      slotId = ownSlot.id;
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
      where: { slotId, seasonYear: rosterYear },
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
