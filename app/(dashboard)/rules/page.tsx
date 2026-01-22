import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllRules } from "@/lib/rules";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-6">
      <PageHeader
        title="League Rules"
        description="Official keeper rules for the league"
      />

      {/* Rules Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-md">
              <span className="text-sm text-primary">
                <span className="font-semibold">{rules.length}</span> total rules
              </span>
            </div>
            <div className="px-3 py-2 bg-success/10 border border-success/20 rounded-md">
              <span className="text-sm text-success">
                <span className="font-semibold">
                  {rules.filter((r) => r.enabled).length}
                </span>{" "}
                enabled
              </span>
            </div>
            <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-md">
              <span className="text-sm text-warning">
                <span className="font-semibold">{rulesBySeason.length}</span> seasons
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules by Season */}
      {rulesBySeason.map(([season, seasonRules]) => (
        <Card key={season}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">
              <span className="text-primary">{season}</span>
              <span className="text-foreground"> Season</span>
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {season === 2023
                  ? "(Founding Rules)"
                  : `(${seasonRules.length} new rule${seasonRules.length > 1 ? "s" : ""})`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-border/50">
            {seasonRules.map((rule) => (
              <div key={rule.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-foreground">
                    {rule.name}
                  </h3>
                  {!rule.enabled && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {rule.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Info Note */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Rules are effective starting
            from their listed season. A rule effective in 2025 applies to the 2025
            draft and all future drafts. Contact the commissioner if you have
            questions about any rule.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
