"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Manage League Rules
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Commissioner: Add, edit, or disable league rules
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                {showAddForm ? "Cancel" : "Add Rule"}
              </button>
              <button
                onClick={() => router.push("/admin/import")}
                className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 dark:text-red-400 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-md p-4">
            <p className="text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Add Rule Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Add New Rule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Code (uppercase, no spaces)
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  placeholder="e.g., NEW_RULE_NAME"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Effective Season
                </label>
                <input
                  type="number"
                  value={newEffectiveSeason}
                  onChange={(e) => setNewEffectiveSeason(e.target.value)}
                  placeholder="e.g., 2026"
                  min="2023"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Human-readable rule name"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Full explanation of the rule"
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={addRule}
                  disabled={adding}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Rule"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Rule
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-24">
                  Season
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-24">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {rule.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <code className="bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded">
                        {rule.code}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                    {rule.effectiveSeason}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleEnabled(rule)}
                      className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                        rule.enabled
                          ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openEditModal(rule)}
                        className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRule(rule)}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Note:</span> Disabling a rule will prevent it
            from being enforced in keeper calculations. Founding rules (2023) should
            generally not be deleted as they define core league mechanics.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Edit Rule
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
