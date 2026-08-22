import { NextRequest, NextResponse } from "next/server";
import { finalizeSelections } from "@/lib/keeper/selection-service";
import { resolveKeeperEditContext } from "@/lib/keeper/edit-context";

// POST - Submit keeper selections.
// Submitting does not lock anything - a manager can change their keepers and
// submit again as often as they like until the deadline.
export async function POST(request: NextRequest) {
  try {
    // Body is optional here - only a commissioner override sends a slotId
    let requestedSlotId: number | null = null;
    try {
      const body = await request.json();
      requestedSlotId = body?.slotId ?? null;
    } catch {
      // No body - submitting own team
    }

    const resolved = await resolveKeeperEditContext(requestedSlotId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { rosterTeam, targetYear, isOverride } = resolved.context;

    const result = await finalizeSelections(rosterTeam.id, targetYear);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, conflicts: result.conflicts },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...result, isOverride });
  } catch (error) {
    console.error("Error submitting keepers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
