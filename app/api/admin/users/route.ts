import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Shared commissioner gate. Checks the REAL identity: while impersonating a
// non-commissioner the effective flag is false, but the real commissioner
// should still be allowed. Returns the real user id, or a NextResponse to
// short-circuit with the appropriate error status.
async function requireCommissioner(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const realUserId = session.realUser?.id ?? session.user.id;
  const realUser = await db.user.findUnique({
    where: { id: realUserId },
    select: { isCommissioner: true },
  });
  if (!realUser?.isCommissioner) {
    return NextResponse.json(
      { error: "Forbidden - Commissioner access required" },
      { status: 403 }
    );
  }
  return realUserId;
}

// GET - List all users for the "View As" picker (commissioner only).
export async function GET() {
  try {
    const gate = await requireCommissioner();
    if (gate instanceof NextResponse) return gate;

    const users = await db.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        isCommissioner: true,
        slots: { select: { id: true }, orderBy: { id: "asc" } },
      },
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        isCommissioner: u.isCommissioner,
        slotIds: u.slots.map((s) => s.id),
      })),
    });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Assign (or clear) the manager of a team slot (commissioner only).
// Body: { slotId: number (1-10), managerId: string | null }
// Enforces one-slot-per-manager: assigning a user to a slot first clears any
// other slot that user currently owns (move, not duplicate).
export async function PATCH(request: Request) {
  try {
    const gate = await requireCommissioner();
    if (gate instanceof NextResponse) return gate;

    const body = await request.json().catch(() => null);
    const slotId = body?.slotId;
    const managerId: string | null = body?.managerId ?? null;

    if (typeof slotId !== "number" || slotId < 1 || slotId > 10) {
      return NextResponse.json(
        { error: "Invalid slotId - must be a number 1-10" },
        { status: 400 }
      );
    }

    const slot = await db.teamSlot.findUnique({ where: { id: slotId } });
    if (!slot) {
      return NextResponse.json(
        { error: `Slot ${slotId} does not exist` },
        { status: 404 }
      );
    }

    if (managerId !== null) {
      const user = await db.user.findUnique({ where: { id: managerId } });
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      // Move semantics: a manager owns at most one slot. Clear their other
      // slots, then claim this one. Wrapped in a transaction so a user can
      // never momentarily own two (or zero) slots.
      await db.$transaction([
        db.teamSlot.updateMany({
          where: { managerId, id: { not: slotId } },
          data: { managerId: null },
        }),
        db.teamSlot.update({
          where: { id: slotId },
          data: { managerId },
        }),
      ]);
    } else {
      // Unassign: clear this slot's manager.
      await db.teamSlot.update({
        where: { id: slotId },
        data: { managerId: null },
      });
    }

    return NextResponse.json({ ok: true, slotId, managerId });
  } catch (error) {
    console.error("Error assigning slot manager:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
