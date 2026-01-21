import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTeamByManagerId,
  getTeamRosterWithKeeperCosts,
  getCurrentSeasonYear,
} from "@/lib/keeper";
import { RosterTable } from "@/components/roster/roster-table";

export default async function MyTeamPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Active season is what we're preparing for (e.g., 2026 draft)
  // Roster season is the previous season's end-of-year roster (e.g., 2025)
  const activeSeasonYear = await getCurrentSeasonYear();
  const rosterSeasonYear = activeSeasonYear - 1;
  const team = await getTeamByManagerId(session.user.id, rosterSeasonYear);

  // If no team assigned, show message
  if (!team) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <PageHeader session={session} />
            <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 rounded-md p-4">
              <h2 className="text-yellow-800 dark:text-yellow-400 font-semibold mb-2">
                No Team Assigned
              </h2>
              <p className="text-yellow-700 dark:text-yellow-500">
                You are not assigned to any team for the {rosterSeasonYear} season.
                Please contact the commissioner to be assigned to a team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // targetYear is what we calculate keeper costs for (the upcoming draft year)
  const roster = await getTeamRosterWithKeeperCosts(team.id, activeSeasonYear);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <PageHeader session={session} />

          {/* Team Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {roster?.team.teamName ?? team.teamName}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {rosterSeasonYear} Roster • {roster?.players.length ?? 0} Players • Keeper costs for {activeSeasonYear}
              </p>
            </div>
            <Link
              href="/my-team/keepers"
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-center"
            >
              Manage Keepers
            </Link>
          </div>

          {/* Roster Table */}
          {roster && roster.players.length > 0 ? (
            <RosterTable players={roster.players} isCommissioner={session.user.isCommissioner} />
          ) : (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <p>No players on roster yet.</p>
              <p className="text-sm mt-1">
                Players will appear here after draft data is imported.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader({ session }: { session: { user?: { name?: string | null; isCommissioner?: boolean } } }) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        My Team
      </h1>
      <div className="flex items-center gap-3">
        <Link
          href="/draft-board"
          className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
        >
          Draft Board
        </Link>
        {session.user?.isCommissioner && (
          <Link
            href="/admin/import"
            className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
          >
            Admin
          </Link>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
