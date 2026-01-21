import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRules } from "@/lib/rules";

// GET - List all rules (public, authenticated users)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await getAllRules();

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
