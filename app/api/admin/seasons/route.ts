import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeadlineState } from "@/lib/keeper/selection-service";

// GET - Get all seasons with deadline info
export async function GET() {
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

    const seasons = await db.season.findMany({
      orderBy: { year: "desc" },
    });

    const seasonsWithState = seasons.map((season) => ({
      ...season,
      deadlineState: getDeadlineState(season.keeperDeadline),
    }));

    return NextResponse.json({ seasons: seasonsWithState });
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update a season's keeper deadline
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { year, keeperDeadline } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "year is required and must be a number" },
        { status: 400 }
      );
    }

    if (!keeperDeadline) {
      return NextResponse.json(
        { error: "keeperDeadline is required" },
        { status: 400 }
      );
    }

    // Parse and validate the deadline
    const deadlineDate = new Date(keeperDeadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for keeperDeadline" },
        { status: 400 }
      );
    }

    // Check if season exists
    const existingSeason = await db.season.findUnique({
      where: { year },
    });

    if (!existingSeason) {
      return NextResponse.json(
        { error: `Season ${year} not found` },
        { status: 404 }
      );
    }

    // Update the deadline
    const updated = await db.season.update({
      where: { year },
      data: { keeperDeadline: deadlineDate },
    });

    return NextResponse.json({
      success: true,
      season: {
        ...updated,
        deadlineState: getDeadlineState(updated.keeperDeadline),
      },
    });
  } catch (error) {
    console.error("Error updating season:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
