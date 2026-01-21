import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllRules } from "@/lib/rules";

export default async function RulesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const rules = await getAllRules();

  // Group rules by effective season
  const rulesBySeasonMap = new Map<number, typeof rules>();
  for (const rule of rules) {
    const existing = rulesBySeasonMap.get(rule.effectiveSeason) ?? [];
    existing.push(rule);
    rulesBySeasonMap.set(rule.effectiveSeason, existing);
  }

  // Convert to sorted array of [year, rules[]]
  const rulesBySeason = Array.from(rulesBySeasonMap.entries()).sort(
    ([a], [b]) => a - b
  );

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                League Rules
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Official keeper rules for the league
              </p>
            </div>
            <Link
              href="/my-team"
              className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors text-center"
            >
              Back to My Team
            </Link>
          </div>
        </div>

        {/* Rules Count Summary */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-4">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{rules.length}</span> total rules
              </span>
            </div>
            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <span className="text-sm text-green-700 dark:text-green-300">
                <span className="font-semibold">
                  {rules.filter((r) => r.enabled).length}
                </span>{" "}
                enabled
              </span>
            </div>
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <span className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-semibold">{rulesBySeason.length}</span> seasons
              </span>
            </div>
          </div>
        </div>

        {/* Rules by Season */}
        {rulesBySeason.map(([season, seasonRules]) => (
          <div
            key={season}
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden"
          >
            {/* Season Header */}
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {season} Season
                <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  {season === 2023
                    ? "(Founding Rules)"
                    : `(${seasonRules.length} new rule${seasonRules.length > 1 ? "s" : ""})`}
                </span>
              </h2>
            </div>

            {/* Rules List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {seasonRules.map((rule) => (
                <div key={rule.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {rule.name}
                        </h3>
                        {rule.enabled ? (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Code: <code className="bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded">{rule.code}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Info Note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Note:</span> Rules are effective starting
            from their listed season. A rule effective in 2025 applies to the 2025
            draft and all future drafts. Contact the commissioner if you have
            questions about any rule.
          </p>
        </div>
      </div>
    </div>
  );
}
