import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE - Remove a keeper override
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

    if (!id) {
      return NextResponse.json(
        { error: "Override ID is required" },
        { status: 400 }
      );
    }

    // Check if override exists
    const existingOverride = await db.keeperOverride.findUnique({
      where: { id },
    });

    if (!existingOverride) {
      return NextResponse.json(
        { error: "Override not found" },
        { status: 404 }
      );
    }

    // Delete the override
    await db.keeperOverride.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting keeper override:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
