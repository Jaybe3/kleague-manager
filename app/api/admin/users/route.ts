import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List all users for the "View As" picker (commissioner only).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gate on the REAL identity: while impersonating a non-commissioner the
    // effective flag is false, but the real commissioner should still be able
    // to switch targets. (Defense-in-depth; token swap is re-verified too.)
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
