"use client";

import { useState, useMemo } from "react";
import type { PlayerKeeperCostResult } from "@/lib/keeper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "name" | "position" | "keeperCost" | "status";
type SortDirection = "asc" | "desc";

interface RosterTableProps {
  players: PlayerKeeperCostResult[];
  isCommissioner?: boolean;
}

const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

export function RosterTable({ players, isCommissioner = false }: RosterTableProps) {
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Helper to get player display name
  const getPlayerName = (p: PlayerKeeperCostResult) =>
    `${p.player.firstName} ${p.player.lastName}`;

  // Helper to get acquisition display string
  const getAcquisitionDisplay = (p: PlayerKeeperCostResult) => {
    if (p.acquisition.type === "DRAFT" && p.acquisition.draftRound) {
      return `Draft Rd ${p.acquisition.draftRound}`;
    }
    return "Free Agent";
  };

  // Get unique positions for filter dropdown
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(players.map((p) => p.player.position))];
    return uniquePositions.sort(
      (a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
    );
  }, [players]);

  // Filter and sort players
  const displayedPlayers = useMemo(() => {
    let filtered = [...players];

    // Apply position filter
    if (positionFilter !== "all") {
      filtered = filtered.filter((p) => p.player.position === positionFilter);
    }

    // Apply eligible filter
    if (eligibleOnly) {
      filtered = filtered.filter((p) => p.calculation.isEligible);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = getPlayerName(a).localeCompare(getPlayerName(b));
          break;
        case "position":
          comparison =
            (POSITION_ORDER[a.player.position] ?? 99) -
            (POSITION_ORDER[b.player.position] ?? 99);
          break;
        case "keeperCost":
          // Ineligible players (null cost) go to the end
          const costA = a.calculation.keeperRound ?? 99;
          const costB = b.calculation.keeperRound ?? 99;
          comparison = costA - costB;
          break;
        case "status":
          comparison = (a.calculation.isEligible ? 0 : 1) - (b.calculation.isEligible ? 0 : 1);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [players, sortField, sortDirection, positionFilter, eligibleOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-muted-foreground/50">↕</span>;
    }
    return (
      <span className="ml-1 text-primary">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Find best value players (eligible with lowest cost)
  const bestValueThreshold = useMemo(() => {
    const eligibleCosts = players
      .filter((p) => p.calculation.isEligible && p.calculation.keeperRound !== null)
      .map((p) => p.calculation.keeperRound as number)
      .sort((a, b) => b - a); // Higher round = better value
    return eligibleCosts[Math.min(2, eligibleCosts.length - 1)] ?? 99;
  }, [players]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Position:</label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-background border-border">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            className="rounded border-border bg-background"
          />
          Eligible only
        </label>

        <div className="text-sm text-muted-foreground ml-auto">
          {displayedPlayers.length} of {players.length} players
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead
                className="cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("name")}
              >
                Player
                <SortIndicator field="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("position")}
              >
                Pos
                <SortIndicator field="position" />
              </TableHead>
              <TableHead className="py-3">Acquisition</TableHead>
              <TableHead className="text-center py-3">Years Kept</TableHead>
              <TableHead
                className="text-center cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("keeperCost")}
              >
                Keeper Cost
                <SortIndicator field="keeperCost" />
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIndicator field="status" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedPlayers.map((p) => {
              const isBestValue =
                p.calculation.isEligible &&
                p.calculation.keeperRound !== null &&
                p.calculation.keeperRound >= bestValueThreshold;

              return (
                <TableRow
                  key={p.player.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {getPlayerName(p)}
                      </span>
                      {isBestValue && (
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-xs">
                          Best Value
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {p.player.position}
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {getAcquisitionDisplay(p)}
                  </TableCell>
                  <TableCell className="py-4 text-center text-muted-foreground">
                    {p.calculation.yearsKept}
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    {p.calculation.isEligible ? (
                      <span className="font-semibold text-foreground">
                        Round {p.calculation.keeperRound}
                        {isCommissioner && p.calculation.isOverride && (
                          <span className="ml-1" title="Commissioner Override">⚙️</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    {p.calculation.isEligible ? (
                      <Badge className="bg-success/20 text-success hover:bg-success/30 border-0">
                        Eligible
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                        Ineligible
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {displayedPlayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No players match the current filters.
        </div>
      )}
    </div>
  );
}
