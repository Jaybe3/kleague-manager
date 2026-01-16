import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamRosterWithKeepers, getCurrentSeasonYear } from "@/lib/keepers";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;

    // Verify the user has access to this team
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { managerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Only allow access if user is the manager or a commissioner
    const isOwner = team.managerId === session.user.id;
    const isCommissioner = session.user.isCommissioner;

    if (!isOwner && !isCommissioner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get season year from query params or use current
    const searchParams = request.nextUrl.searchParams;
    const seasonYearParam = searchParams.get("seasonYear");
    const seasonYear = seasonYearParam
      ? parseInt(seasonYearParam, 10)
      : await getCurrentSeasonYear();

    const roster = await getTeamRosterWithKeepers(teamId, seasonYear);

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching roster:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
