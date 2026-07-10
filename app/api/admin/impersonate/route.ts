import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Authorizes and audit-logs impersonation. The actual identity swap happens
 * in the JWT callback via the client's `useSession().update()` call, which
 * independently re-verifies commissioner status. This route is the audit
 * trail and the first authorization gate.
 */

// POST - Start impersonating a user (commissioner only).
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const realUserId = session.realUser?.id ?? session.user.id;
    const realUser = await db.user.findUnique({ where: { id: realUserId } });
    if (!realUser?.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const { targetUserId } = await request.json();
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 }
      );
    }
    if (targetUserId === realUserId) {
      return NextResponse.json(
        { error: "Cannot impersonate yourself" },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.auditLog.create({
      data: {
        userId: realUserId,
        action: "IMPERSONATE_START",
        entityType: "User",
        entityId: targetUserId,
        details: JSON.stringify({
          targetEmail: target.email,
          targetName: target.displayName,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      target: { id: target.id, name: target.displayName },
    });
  } catch (error) {
    console.error("Error starting impersonation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Stop impersonating and return to the real identity.
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only meaningful while impersonating; realUser holds the true identity.
    const realUserId = session.realUser?.id;
    if (realUserId && session.impersonating) {
      await db.auditLog.create({
        data: {
          userId: realUserId,
          action: "IMPERSONATE_STOP",
          entityType: "User",
          entityId: session.user.id,
          details: JSON.stringify({ stoppedImpersonating: session.user.id }),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error stopping impersonation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
