import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List all rules (commissioner only, includes all details)
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

    const rules = await db.leagueRule.findMany({
      orderBy: [{ effectiveSeason: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new rule (commissioner only)
export async function POST(request: NextRequest) {
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
    const { code, name, description, effectiveSeason, enabled } = body;

    // Validate required fields
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "code is required and must be a string" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required and must be a string" },
        { status: 400 }
      );
    }

    if (!effectiveSeason || typeof effectiveSeason !== "number") {
      return NextResponse.json(
        { error: "effectiveSeason is required and must be a number" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await db.leagueRule.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A rule with this code already exists" },
        { status: 409 }
      );
    }

    // Create the rule
    const rule = await db.leagueRule.create({
      data: {
        code: code.toUpperCase().replace(/\s+/g, "_"),
        name,
        description,
        effectiveSeason,
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
