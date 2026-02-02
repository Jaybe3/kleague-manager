import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllSlotsWithNames } from "@/lib/slots";

// GET - Get all slots with their current team names
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slots = await getAllSlotsWithNames();

    return NextResponse.json({
      slots: slots.map((s) => ({
        slotId: s.slotId,
        teamName: s.teamName,
      })),
    });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
