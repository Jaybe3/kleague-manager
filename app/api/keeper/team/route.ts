import { NextRequest, NextResponse } from "next/server";
import { getTeamEligibleKeepers } from "@/lib/keeper";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const year = searchParams.get("year");

  if (!teamId || !year) {
    return NextResponse.json(
      { error: "teamId and year are required" },
      { status: 400 }
    );
  }

  const targetYear = parseInt(year);
  const keepers = await getTeamEligibleKeepers(teamId, targetYear);

  return NextResponse.json({ keepers });
}
