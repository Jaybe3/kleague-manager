import { NextRequest, NextResponse } from "next/server";
import { removePlayer } from "@/lib/keeper/selection-service";
import { resolveKeeperEditContext } from "@/lib/keeper/edit-context";

// DELETE - Remove a player from keeper selections
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;

    // Optional slotId - commissioner editing another team
    const { searchParams } = new URL(request.url);
    const slotIdParam = searchParams.get("slotId");

    const resolved = await resolveKeeperEditContext(
      slotIdParam ? parseInt(slotIdParam, 10) : null
    );
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { rosterTeam, targetYear, isOverride } = resolved.context;

    const result = await removePlayer(rosterTeam.id, playerId, targetYear);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, isOverride });
  } catch (error) {
    console.error("Error removing keeper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
