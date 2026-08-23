import { NextRequest, NextResponse } from "next/server";
import { setIrExemption } from "@/lib/keeper/selection-service";
import { resolveKeeperEditContext } from "@/lib/keeper/edit-context";

/**
 * POST - Grant or lift a QB's IR exemption.
 *
 * Commissioner-only: an exemption lets a team carry a fourth quarterback,
 * so it isn't something a manager can hand themselves.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, isIrExempt, slotId: requestedSlotId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    if (typeof isIrExempt !== "boolean") {
      return NextResponse.json(
        { error: "isIrExempt must be true or false" },
        { status: 400 }
      );
    }

    const resolved = await resolveKeeperEditContext(requestedSlotId ?? null);
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const { rosterTeam, targetYear, isCommissioner } = resolved.context;

    if (!isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - only the commissioner can set an IR exemption" },
        { status: 403 }
      );
    }

    const result = await setIrExemption(
      rosterTeam.id,
      playerId,
      targetYear,
      isIrExempt
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error setting IR exemption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
