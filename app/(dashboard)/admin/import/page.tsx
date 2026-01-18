"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ImportType = "draft" | "fa";
type InputMode = "text" | "file";
type Tab = "import" | "trade";

interface ImportResult {
  success: boolean;
  importType: ImportType;
  seasonYear: number;
  imported: {
    teams: number;
    players: number;
    acquisitions: number;
  };
  skipped: {
    duplicates: number;
    invalid: number;
  };
  errors: string[];
  warnings: string[];
}

interface Team {
  id: string;
  teamName: string;
  slotId: number;
}

interface Season {
  year: number;
  totalRounds: number;
  isActive: boolean;
}

export default function AdminImportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("import");

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Admin: Data Management
            </h1>
            <button
              onClick={() => router.push("/my-team")}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6">
            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "import"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Import Data
            </button>
            <button
              onClick={() => setActiveTab("trade")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "trade"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Enter Trade
            </button>
          </div>

          {activeTab === "import" && <ImportSection />}
          {activeTab === "trade" && <TradeSection />}
        </div>
      </div>
    </div>
  );
}

// ============= Import Section =============

function ImportSection() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("draft");
  const [seasonYear, setSeasonYear] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch seasons on mount
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch("/api/admin/seasons");
        if (res.ok) {
          const data = await res.json();
          const sortedSeasons = (data.seasons as Season[]).sort((a, b) => a.year - b.year);
          setSeasons(sortedSeasons);
          // Default to the active season, or the most recent one
          const activeSeason = sortedSeasons.find((s) => s.isActive);
          const defaultSeason = activeSeason || sortedSeasons[sortedSeasons.length - 1];
          if (defaultSeason) {
            setSeasonYear(String(defaultSeason.year));
          }
        }
      } catch (err) {
        console.error("Failed to fetch seasons:", err);
      } finally {
        setSeasonsLoading(false);
      }
    }
    fetchSeasons();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (inputMode === "text" && !text.trim()) {
      setError("Please paste data from CBS");
      return;
    }
    if (inputMode === "file" && !file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response: Response;

      if (inputMode === "text") {
        // Send JSON for text import
        response = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            importType,
            seasonYear: parseInt(seasonYear, 10),
          }),
        });
      } else {
        // Send FormData for file import
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("importType", importType);
        formData.append("seasonYear", seasonYear);

        response = await fetch("/api/admin/import", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Import failed");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          Import Instructions
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>1. <strong>Draft Picks:</strong> Import first to create season, teams, and players</li>
          <li>2. <strong>FA Signings:</strong> Import after draft data (requires teams to exist)</li>
          <li>3. Copy data from CBS and paste below, or upload an Excel file</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Import Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Import Type
          </label>
          <select
            value={importType}
            onChange={(e) => setImportType(e.target.value as ImportType)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          >
            <option value="draft">Draft Picks</option>
            <option value="fa">Free Agent Signings</option>
          </select>
        </div>

        {/* Season Year */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Season Year
          </label>
          {seasonsLoading ? (
            <div className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-500">
              Loading seasons...
            </div>
          ) : seasons.length === 0 ? (
            <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              No seasons found. Please create a season first.
            </div>
          ) : (
            <select
              value={seasonYear}
              onChange={(e) => setSeasonYear(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            >
              {seasons.map((season) => (
                <option key={season.year} value={season.year}>
                  {season.year} ({season.totalRounds} rounds){season.isActive ? " - Active" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Input Mode Toggle */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Input Method
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                inputMode === "text"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              Paste Text (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                inputMode === "file"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              Upload Excel
            </button>
          </div>
        </div>

        {/* Text Input */}
        {inputMode === "text" && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Paste CBS Data
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                importType === "draft"
                  ? "Round 1\nPick\tTeam\tPlayer\t...\n1\tGo Go Garrett\tPatrick Mahomes QB • KC\t..."
                  : "Date\tTeam\tPlayers\tEffective\n12/30/23 1:42 AM ET\tSweet Chin Music\tJonathan Owens DB • CHI - Signed for $0\t17"
              }
              rows={10}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Copy directly from CBS and paste here. Tab-separated values are expected.
            </p>
          </div>
        )}

        {/* File Input */}
        {inputMode === "file" && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Excel File (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !seasonYear || (inputMode === "text" ? !text.trim() : !file)}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
        >
          {loading ? "Importing..." : `Import ${importType === "draft" ? "Draft Picks" : "FA Signings"}`}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md">
          <p className="text-red-700 dark:text-red-400 font-medium">
            Error: {error}
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && <ImportResultDisplay result={result} />}
    </div>
  );
}

function ImportResultDisplay({ result }: { result: ImportResult }) {
  return (
    <div className="mt-6 space-y-4">
      <div
        className={`p-4 rounded-md ${
          result.success
            ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800"
            : "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800"
        }`}
      >
        <p
          className={`font-medium ${
            result.success
              ? "text-green-700 dark:text-green-400"
              : "text-yellow-700 dark:text-yellow-400"
          }`}
        >
          {result.success
            ? `${result.importType === "draft" ? "Draft" : "FA"} import completed successfully!`
            : "Import completed with errors"}
        </p>
      </div>

      {/* Import Summary */}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-md p-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Import Summary ({result.seasonYear})
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">Type:</div>
          <div className="text-zinc-900 dark:text-zinc-100">
            {result.importType === "draft" ? "Draft Picks" : "FA Signings"}
          </div>
          <div className="text-zinc-600 dark:text-zinc-400">Teams:</div>
          <div className="text-zinc-900 dark:text-zinc-100">{result.imported.teams}</div>
          <div className="text-zinc-600 dark:text-zinc-400">Players:</div>
          <div className="text-zinc-900 dark:text-zinc-100">{result.imported.players}</div>
          <div className="text-zinc-600 dark:text-zinc-400">Acquisitions:</div>
          <div className="text-zinc-900 dark:text-zinc-100">{result.imported.acquisitions}</div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            Warnings ({result.warnings.length})
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 max-h-40 overflow-y-auto">
            {result.warnings.slice(0, 20).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {result.warnings.length > 20 && (
              <li>... and {result.warnings.length - 20} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            Errors ({result.errors.length})
          </h3>
          <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 max-h-40 overflow-y-auto">
            {result.errors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > 20 && (
              <li>... and {result.errors.length - 20} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============= Trade Section =============

function TradeSection() {
  const [seasonYear, setSeasonYear] = useState("2024");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [playerFirstName, setPlayerFirstName] = useState("");
  const [playerLastName, setPlayerLastName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [fromTeam, setFromTeam] = useState("");
  const [toTeam, setToTeam] = useState("");
  const [tradeDate, setTradeDate] = useState("");

  async function loadTeams() {
    try {
      const response = await fetch(
        `/api/admin/trade?action=teams&seasonYear=${seasonYear}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load teams");
        return;
      }

      setTeams(data.teams);
      setTeamsLoaded(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Generate PlayerMatch key
    const playerMatchKey = `${playerFirstName}${playerLastName}`.replace(/\s/g, "");

    try {
      const response = await fetch("/api/admin/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerMatchKey,
          playerFirstName,
          playerLastName,
          playerPosition,
          fromTeamName: fromTeam,
          toTeamName: toTeam,
          tradeDate,
          seasonYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to enter trade");
        return;
      }

      setSuccess(data.message);
      // Clear form
      setPlayerFirstName("");
      setPlayerLastName("");
      setPlayerPosition("");
      setFromTeam("");
      setToTeam("");
      setTradeDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enter trade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          Manual Trade Entry
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Enter trade details manually. The player will retain their original draft round/pick.
        </p>
      </div>

      {/* Season Year Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Season Year
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={seasonYear}
            onChange={(e) => {
              setSeasonYear(e.target.value);
              setTeamsLoaded(false);
              setTeams([]);
            }}
            min="2000"
            max="2100"
            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={loadTeams}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
          >
            Load Teams
          </button>
        </div>
      </div>

      {!teamsLoaded ? (
        <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
          <p>Select a season year and click "Load Teams" to enter a trade.</p>
          <p className="text-sm mt-2">Teams must exist (import draft data first).</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-yellow-600 dark:text-yellow-400">
          <p>No teams found for season {seasonYear}.</p>
          <p className="text-sm mt-2">Import draft data first to create teams.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={playerFirstName}
                onChange={(e) => setPlayerFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={playerLastName}
                onChange={(e) => setPlayerLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Position
              </label>
              <select
                value={playerPosition}
                onChange={(e) => setPlayerPosition(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select...</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
                <option value="LB">LB</option>
                <option value="DB">DB</option>
                <option value="DL">DL</option>
              </select>
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                From Team
              </label>
              <select
                value={fromTeam}
                onChange={(e) => setFromTeam(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.teamName}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                To Team
              </label>
              <select
                value={toTeam}
                onChange={(e) => setToTeam(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.teamName}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trade Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Trade Date
            </label>
            <input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
          >
            {loading ? "Recording Trade..." : "Record Trade"}
          </button>
        </form>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-md">
          <p className="text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}
    </div>
  );
}
