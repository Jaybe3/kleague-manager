"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import { MobileSort } from "@/components/players/mobile-sort";

interface PlayerRow {
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  slotId: number;
  ownerTeamName: string;
  acquisitionType: "DRAFT" | "FA";
  yearsKept: number;
  keeperRound: number | null;
  isEligible: boolean;
  isOverride: boolean;
}

interface AllPlayersResponse {
  targetYear: number;
  rosterYear: number;
  players: PlayerRow[];
  owners: { slotId: number; teamName: string }[];
  positions: string[];
  availableSeasons: number[];
}

type SortKey = "name" | "position" | "owner" | "acquisition" | "yearsKept" | "keeperRound" | "status";
type SortDir = "asc" | "desc";

export default function AllPlayersPage() {
  const [data, setData] = useState<AllPlayersResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("keeperRound");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedYear !== null && data?.targetYear !== selectedYear) {
      fetchData(selectedYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  async function fetchData(year?: number) {
    try {
      setLoading(true);
      setError(null);
      const url = year ? `/api/all-players?year=${year}` : "/api/all-players";
      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to load players");
      }

      setData(result);
      if (selectedYear === null && result.targetYear) {
        setSelectedYear(result.targetYear);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredPlayers = useMemo(() => {
    if (!data) return [];

    let rows = data.players;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      );
    }
    if (ownerFilter !== "all") {
      rows = rows.filter((p) => p.slotId === parseInt(ownerFilter, 10));
    }
    if (positionFilter !== "all") {
      rows = rows.filter((p) => p.position === positionFilter);
    }
    if (statusFilter === "eligible") {
      rows = rows.filter((p) => p.isEligible);
    } else if (statusFilter === "ineligible") {
      rows = rows.filter((p) => !p.isEligible);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.lastName.localeCompare(b.lastName);
        case "position":
          return dir * a.position.localeCompare(b.position);
        case "owner":
          return dir * a.ownerTeamName.localeCompare(b.ownerTeamName);
        case "acquisition":
          return dir * a.acquisitionType.localeCompare(b.acquisitionType);
        case "yearsKept":
          return dir * (a.yearsKept - b.yearsKept);
        case "keeperRound": {
          // Ineligible (null) always sort to the bottom regardless of direction
          const ar = a.keeperRound;
          const br = b.keeperRound;
          if (ar === null && br === null) return a.lastName.localeCompare(b.lastName);
          if (ar === null) return 1;
          if (br === null) return -1;
          return dir * (ar - br);
        }
        case "status":
          return dir * (Number(b.isEligible) - Number(a.isEligible));
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, search, ownerFilter, positionFilter, statusFilter, sortKey, sortDir]);

  const SortHeader = ({ label, sortKey: key, className = "" }: { label: string; sortKey: SortKey; className?: string }) => (
    <th className={`px-3 py-2 text-left text-xs font-semibold text-foreground ${className}`}>
      <button
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
      >
        {label}
        {sortKey === key &&
          (sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Players"
        description="Every player on every roster, league-wide"
        actions={
          data && (
            <Select
              value={selectedYear?.toString() ?? ""}
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
              disabled={loading}
            >
              <SelectTrigger className="w-[140px] bg-background border-border">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {data.availableSeasons.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} Keepers
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md p-4">
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          {/* Desktop: search + three dropdowns */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Search player..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {data?.owners.map((o) => (
                  <SelectItem key={o.slotId} value={o.slotId.toString()}>
                    {o.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                {data?.positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Keeper status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All players</SelectItem>
                <SelectItem value="eligible">Eligible to keep</SelectItem>
                <SelectItem value="ineligible">Ineligible to keep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: search + status chips + owner/position */}
          <div className="md:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search player..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([
                ["all", "All"],
                ["eligible", "Eligible"],
                ["ineligible", "Ineligible"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                    statusFilter === value
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  {data?.owners.map((o) => (
                    <SelectItem key={o.slotId} value={o.slotId.toString()}>
                      {o.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {data?.positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded"></div>
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No players match your filters</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                {filteredPlayers.length} player{filteredPlayers.length === 1 ? "" : "s"}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <SortHeader label="Player" sortKey="name" />
                      <SortHeader label="Pos" sortKey="position" />
                      <SortHeader label="Owner" sortKey="owner" />
                      <SortHeader label="Acq" sortKey="acquisition" />
                      <SortHeader label="Yrs Kept" sortKey="yearsKept" />
                      <SortHeader label="Keeper Round" sortKey="keeperRound" />
                      <SortHeader label="Status" sortKey="status" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPlayers.map((p) => (
                      <tr key={`${p.slotId}-${p.playerId}`} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.position}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {p.ownerTeamName}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.acquisitionType}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.yearsKept}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.keeperRound !== null ? (
                            <span className="font-medium text-foreground">
                              Round {p.keeperRound}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {p.isOverride && (
                            <span className="ml-1 text-xs text-primary">(override)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.isEligible ? (
                            <Badge variant="default">Eligible</Badge>
                          ) : (
                            <Badge variant="secondary">Ineligible</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: sort control + stacked cards */}
              <MobileSort
                value={sortKey}
                direction={sortDir}
                onFieldChange={(v) => setSortKey(v as SortKey)}
                onToggleDirection={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                options={[
                  { value: "keeperRound", label: "Keeper round" },
                  { value: "name", label: "Name" },
                  { value: "position", label: "Position" },
                  { value: "owner", label: "Owner" },
                  { value: "status", label: "Status" },
                  { value: "yearsKept", label: "Years kept" },
                ]}
              />
              <div className="md:hidden space-y-3">
                {filteredPlayers.map((p) => (
                  <div
                    key={`${p.slotId}-${p.playerId}`}
                    className={`rounded-lg border border-border border-l-4 bg-card p-3 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.08)] ${
                      p.isEligible ? "border-l-success" : "border-l-muted opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold leading-none text-muted-foreground">
                          {p.position}
                        </span>
                        <h3 className="truncate text-[15px] font-semibold text-foreground">
                          {p.firstName} {p.lastName}
                        </h3>
                      </div>
                      {p.keeperRound !== null ? (
                        <span className="shrink-0 rounded bg-primary-container px-2 py-0.5 font-mono text-sm text-on-primary-container tabular-nums">
                          R{p.keeperRound}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                    <div className="mb-2 text-[13px]">
                      {p.isEligible ? (
                        <span className="text-success">
                          Eligible
                          {p.isOverride && (
                            <>
                              <span className="text-muted-foreground"> · </span>
                              <span className="italic text-primary">override</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Ineligible</span>
                      )}
                    </div>
                    <div className="text-[12px] uppercase tracking-wider text-muted-foreground">
                      <div className="truncate">{p.ownerTeamName}</div>
                      <div className="whitespace-nowrap">
                        {p.acquisitionType}
                        <span className="mx-1.5 opacity-40">•</span>
                        {p.yearsKept} yr{p.yearsKept === 1 ? "" : "s"} kept
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
