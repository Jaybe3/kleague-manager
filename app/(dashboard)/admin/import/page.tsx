"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeBuilder, TradeData } from "@/components/admin/trade-builder";
import { TradePreview } from "@/components/admin/trade-preview";

type ImportType = "draft" | "fa";
type InputMode = "text" | "file";

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Management"
        description="Import draft data, FA signings, and enter trades"
      />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="import">
            <TabsList className="mb-6">
              <TabsTrigger value="import">Import Data</TabsTrigger>
              <TabsTrigger value="trade">Enter Trade</TabsTrigger>
            </TabsList>
            <TabsContent value="import">
              <ImportSection />
            </TabsContent>
            <TabsContent value="trade">
              <TradeSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
        <h3 className="font-medium text-primary mb-2">
          Import Instructions
        </h3>
        <ul className="text-sm text-primary/80 space-y-1">
          <li>1. <strong>Draft Picks:</strong> Import first to create season, teams, and players</li>
          <li>2. <strong>FA Signings:</strong> Import after draft data (requires teams to exist)</li>
          <li>3. Copy data from CBS and paste below, or upload an Excel file</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Import Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Import Type
          </label>
          <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
            <SelectTrigger className="w-full bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft Picks</SelectItem>
              <SelectItem value="fa">Free Agent Signings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Season Year */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Season Year
          </label>
          {seasonsLoading ? (
            <div className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground">
              Loading seasons...
            </div>
          ) : seasons.length === 0 ? (
            <div className="w-full px-3 py-2 border border-error/30 rounded-md bg-error/10 text-error">
              No seasons found. Please create a season first.
            </div>
          ) : (
            <Select value={seasonYear} onValueChange={setSeasonYear}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season) => (
                  <SelectItem key={season.year} value={String(season.year)}>
                    {season.year} ({season.totalRounds} rounds){season.isActive ? " - Active" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Input Mode Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Input Method
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={inputMode === "text" ? "default" : "outline"}
              onClick={() => setInputMode("text")}
              className="flex-1"
            >
              Paste Text (Recommended)
            </Button>
            <Button
              type="button"
              variant={inputMode === "file" ? "default" : "outline"}
              onClick={() => setInputMode("file")}
              className="flex-1"
            >
              Upload Excel
            </Button>
          </div>
        </div>

        {/* Text Input */}
        {inputMode === "text" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Paste CBS Data
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                importType === "draft"
                  ? "Round 1\nPick\tTeam\tPlayer\t...\n1\tGo Go Garrett\tPatrick Mahomes QB • KC\t..."
                  : "Date\tTeam\tPlayers\tEffective\n12/30/23 1:42 AM ET\tSweet Chin Music\tJonathan Owens DB • CHI - Signed for $0\t17"
              }
              rows={10}
              className="font-mono text-sm bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Copy directly from CBS and paste here. Tab-separated values are expected.
            </p>
          </div>
        )}

        {/* File Input */}
        {inputMode === "file" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Excel File (.xlsx)
            </label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-background border-border"
            />
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !seasonYear || (inputMode === "text" ? !text.trim() : !file)}
          className="w-full"
        >
          {loading ? "Importing..." : `Import ${importType === "draft" ? "Draft Picks" : "FA Signings"}`}
        </Button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-md">
          <p className="text-error font-medium">
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
    <div className="space-y-4">
      {/* Status Banner */}
      <div
        className={`p-4 rounded-md ${
          result.success
            ? "bg-success/10 border border-success/20"
            : "bg-warning/10 border border-warning/20"
        }`}
      >
        <p
          className={`font-medium ${
            result.success ? "text-success" : "text-warning"
          }`}
        >
          {result.success
            ? `${result.importType === "draft" ? "Draft" : "FA"} import completed successfully!`
            : "Import completed with errors"}
        </p>
      </div>

      {/* Import Summary */}
      <div className="bg-muted/50 border border-border rounded-md p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Import Summary ({result.seasonYear})
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Type:</div>
          <div className="text-foreground">
            {result.importType === "draft" ? "Draft Picks" : "FA Signings"}
          </div>
          <div className="text-muted-foreground">Teams:</div>
          <div className="text-foreground">{result.imported.teams}</div>
          <div className="text-muted-foreground">Players:</div>
          <div className="text-foreground">{result.imported.players}</div>
          <div className="text-muted-foreground">Acquisitions:</div>
          <div className="text-foreground">{result.imported.acquisitions}</div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-4">
          <h3 className="font-semibold text-warning mb-2">
            Warnings ({result.warnings.length})
          </h3>
          <ul className="text-sm text-warning/80 space-y-1 max-h-40 overflow-y-auto">
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
        <div className="bg-error/10 border border-error/20 rounded-md p-4">
          <h3 className="font-semibold text-error mb-2">
            Errors ({result.errors.length})
          </h3>
          <ul className="text-sm text-error/80 space-y-1 max-h-40 overflow-y-auto">
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
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [teams, setTeams] = useState<{ slotId: number; teamName: string }[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);

  // Trade preview state
  const [pendingTrade, setPendingTrade] = useState<TradeData | null>(null);

  // Fetch seasons on mount
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch("/api/admin/seasons");
        if (res.ok) {
          const data = await res.json();
          const sortedSeasons = (data.seasons as Season[]).sort(
            (a, b) => a.year - b.year
          );
          setSeasons(sortedSeasons);
          // Default to the active season, or the most recent one
          const activeSeason = sortedSeasons.find((s) => s.isActive);
          const defaultSeason =
            activeSeason || sortedSeasons[sortedSeasons.length - 1];
          if (defaultSeason) {
            setSeasonYear(defaultSeason.year);
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

  // Fetch teams when season changes
  useEffect(() => {
    if (!seasonYear) return;

    async function fetchTeams() {
      setTeamsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/trade?action=teams&seasonYear=${seasonYear}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load teams");
          setTeams([]);
          return;
        }

        // Map to the format TradeBuilder expects
        const mappedTeams = data.teams.map((t: Team) => ({
          slotId: t.slotId,
          teamName: t.teamName,
        }));
        setTeams(mappedTeams);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teams");
        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    }
    fetchTeams();
  }, [seasonYear]);

  const handlePreview = (trade: TradeData) => {
    setError(null);
    setSuccess(null);
    setPendingTrade(trade);
  };

  const handleCancelPreview = () => {
    setPendingTrade(null);
  };

  const handleConfirmTrade = async () => {
    if (!pendingTrade) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: {
            slotId: pendingTrade.teamA.slotId,
            playerIds: pendingTrade.teamA.players.map((p) => p.id),
          },
          teamB: {
            slotId: pendingTrade.teamB.slotId,
            playerIds: pendingTrade.teamB.players.map((p) => p.id),
          },
          tradeDate: pendingTrade.tradeDate,
          seasonYear: pendingTrade.seasonYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to record trade");
        return;
      }

      setSuccess(data.message);
      setPendingTrade(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record trade");
    } finally {
      setLoading(false);
    }
  };

  // Season selector
  if (seasonsLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading seasons...
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="text-center py-8 text-warning">
        <p>No seasons found. Please create a season first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
        <h3 className="font-medium text-primary mb-2">Multi-Player Trade Entry</h3>
        <p className="text-sm text-primary/80">
          Select teams and add players from each roster. Players retain their
          original draft round for keeper cost calculations.
        </p>
      </div>

      {/* Season Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Season Year
        </label>
        <Select
          value={seasonYear ? String(seasonYear) : ""}
          onValueChange={(v) => {
            setSeasonYear(parseInt(v, 10));
            setPendingTrade(null);
            setSuccess(null);
            setError(null);
          }}
        >
          <SelectTrigger className="w-48 bg-background border-border">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season.year} value={String(season.year)}>
                {season.year}
                {season.isActive ? " - Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading teams */}
      {teamsLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading teams...
        </div>
      )}

      {/* No teams */}
      {!teamsLoading && teams.length === 0 && seasonYear && (
        <div className="text-center py-8 text-warning">
          <p>No teams found for season {seasonYear}.</p>
          <p className="text-sm mt-2 text-warning/80">
            Import draft data first to create teams.
          </p>
        </div>
      )}

      {/* Trade Builder or Preview */}
      {!teamsLoading && teams.length > 0 && seasonYear && (
        <>
          {pendingTrade ? (
            <TradePreview
              trade={pendingTrade}
              onConfirm={handleConfirmTrade}
              onCancel={handleCancelPreview}
              loading={loading}
            />
          ) : (
            <TradeBuilder
              seasonYear={seasonYear}
              teams={teams}
              onPreview={handlePreview}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-md">
          <p className="text-error font-medium">Error: {error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-md">
          <p className="text-success font-medium">{success}</p>
        </div>
      )}
    </div>
  );
}
