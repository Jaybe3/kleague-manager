"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface LeagueRule {
  id: string;
  code: string;
  name: string;
  description: string;
  effectiveSeason: number;
  enabled: boolean;
}

export default function AdminRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<LeagueRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editingRule, setEditingRule] = useState<LeagueRule | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add rule form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEffectiveSeason, setNewEffectiveSeason] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/rules");

      if (res.status === 403) {
        router.push("/my-team");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load rules");
      }

      const data = await res.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(rule: LeagueRule) {
    try {
      setError(null);
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update rule");
      }

      const data = await res.json();
      setRules(rules.map((r) => (r.id === rule.id ? data.rule : r)));
      setSuccess(`Rule "${rule.name}" ${data.rule.enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    }
  }

  function openEditModal(rule: LeagueRule) {
    setEditingRule(rule);
    setEditName(rule.name);
    setEditDescription(rule.description);
  }

  function closeEditModal() {
    setEditingRule(null);
    setEditName("");
    setEditDescription("");
  }

  async function saveEdit() {
    if (!editingRule) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/rules/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update rule");
      }

      const data = await res.json();
      setRules(rules.map((r) => (r.id === editingRule.id ? data.rule : r)));
      setSuccess(`Rule "${data.rule.name}" updated`);
      closeEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setSaving(false);
    }
  }

  async function addRule() {
    if (!newCode || !newName || !newDescription || !newEffectiveSeason) {
      setError("Please fill in all fields");
      return;
    }

    const season = parseInt(newEffectiveSeason, 10);
    if (isNaN(season) || season < 2023) {
      setError("Effective season must be 2023 or later");
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          description: newDescription,
          effectiveSeason: season,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add rule");
      }

      const data = await res.json();
      setRules([...rules, data.rule].sort((a, b) =>
        a.effectiveSeason - b.effectiveSeason || a.name.localeCompare(b.name)
      ));
      setSuccess(`Rule "${data.rule.name}" added`);
      setShowAddForm(false);
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setNewEffectiveSeason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    } finally {
      setAdding(false);
    }
  }

  async function deleteRule(rule: LeagueRule) {
    const confirmMsg = rule.effectiveSeason === 2023
      ? `Are you sure you want to delete the founding rule "${rule.name}"? This action cannot be undone.`
      : `Are you sure you want to delete "${rule.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      setError(null);
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rule");
      }

      setRules(rules.filter((r) => r.id !== rule.id));
      setSuccess(`Rule "${rule.name}" deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Manage League Rules"
          description="Loading..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage League Rules"
        description="Add, edit, or disable league rules"
        actions={
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant={showAddForm ? "secondary" : "default"}
          >
            {showAddForm ? "Cancel" : "Add Rule"}
          </Button>
        }
      />

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md p-4">
          <p className="text-error">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-error/80 underline hover:text-error">
            Dismiss
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-md p-4">
          <p className="text-success">{success}</p>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Add New Rule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Code (uppercase, no spaces)
                </label>
                <Input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  placeholder="e.g., NEW_RULE_NAME"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Effective Season
                </label>
                <Input
                  type="number"
                  value={newEffectiveSeason}
                  onChange={(e) => setNewEffectiveSeason(e.target.value)}
                  placeholder="e.g., 2026"
                  min={2023}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name
                </label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Human-readable rule name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Full explanation of the rule"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={addRule}
                  disabled={adding}
                >
                  {adding ? "Adding..." : "Add Rule"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Rule
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-24">
                    Season
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-24">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {rule.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <code className="bg-muted px-1 py-0.5 rounded">
                          {rule.code}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {rule.effectiveSeason}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleEnabled(rule)}
                        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                          rule.enabled
                            ? "bg-success/20 text-success hover:bg-success/30"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(rule)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(rule)}
                          className="text-error hover:text-error hover:bg-error/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Disabling a rule will prevent it
            from being enforced in keeper calculations. Founding rules (2023) should
            generally not be deleted as they define core league mechanics.
          </p>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Edit Rule
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name
                </label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={closeEditModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
