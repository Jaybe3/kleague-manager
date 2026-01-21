import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH - Update a rule (commissioner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if rule exists
    const existing = await db.leagueRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, enabled } = body;

    // Build update data
    const updateData: {
      name?: string;
      description?: string;
      enabled?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "name must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.trim() === "") {
        return NextResponse.json(
          { error: "description must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.description = description;
    }

    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return NextResponse.json(
          { error: "enabled must be a boolean" },
          { status: 400 }
        );
      }
      updateData.enabled = enabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the rule
    const rule = await db.leagueRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a rule (commissioner only)
// Note: Founding rules (2023) should generally not be deleted
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if rule exists
    const existing = await db.leagueRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Warn about deleting founding rules but allow it
    if (existing.effectiveSeason === 2023) {
      console.warn(
        `Commissioner deleting founding rule: ${existing.code} (${existing.name})`
      );
    }

    // Delete the rule
    await db.leagueRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
