"use client";

import { useState, useMemo } from "react";
import { EligiblePlayer } from "@/lib/keeper/selection-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "name" | "position" | "keeperCost";
type SortDirection = "asc" | "desc";

const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

interface EligiblePlayersTableProps {
  players: EligiblePlayer[];
  canSelectMore: boolean;
  isFinalized: boolean;
  onSelect: (playerId: string) => Promise<void>;
}

export function EligiblePlayersTable({
  players,
  canSelectMore,
  isFinalized,
  onSelect,
}: EligiblePlayersTableProps) {
  const [sortField, setSortField] = useState<SortField>("keeperCost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);

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

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = `${a.player.firstName} ${a.player.lastName}`.localeCompare(
            `${b.player.firstName} ${b.player.lastName}`
          );
          break;
        case "position":
          comparison =
            (POSITION_ORDER[a.player.position] ?? 99) -
            (POSITION_ORDER[b.player.position] ?? 99);
          break;
        case "keeperCost":
          comparison = a.keeperCost - b.keeperCost;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [players, sortField, sortDirection, positionFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "keeperCost" ? "desc" : "asc");
    }
  };

  const handleSelect = async (playerId: string) => {
    setLoadingPlayerId(playerId);
    try {
      await onSelect(playerId);
    } finally {
      setLoadingPlayerId(null);
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

  // Find best value players (highest round = better value)
  const bestValueThreshold = useMemo(() => {
    const costs = players
      .filter((p) => !p.isSelected)
      .map((p) => p.keeperCost)
      .sort((a, b) => b - a);
    return costs[Math.min(2, costs.length - 1)] ?? 99;
  }, [players]);

  const unselectedPlayers = displayedPlayers.filter((p) => !p.isSelected);

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No eligible players on roster.
      </div>
    );
  }

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

        <div className="text-sm text-muted-foreground ml-auto">
          {unselectedPlayers.length} available
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
              <TableHead
                className="text-center cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("keeperCost")}
              >
                Keeper Cost
                <SortIndicator field="keeperCost" />
              </TableHead>
              {!isFinalized && (
                <TableHead className="text-center py-3">Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedPlayers.map((item) => {
              const isLoading = loadingPlayerId === item.player.id;
              const isBestValue =
                !item.isSelected && item.keeperCost >= bestValueThreshold;

              return (
                <TableRow
                  key={item.player.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                    item.isSelected ? "bg-success/5 opacity-50" : ""
                  }`}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {item.player.firstName} {item.player.lastName}
                      </span>
                      {isBestValue && (
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-xs">
                          Best Value
                        </Badge>
                      )}
                      {item.isSelected && (
                        <Badge className="bg-success/20 text-success hover:bg-success/30 border-0 text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {item.player.position}
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <span className="font-semibold text-foreground">
                      Round {item.keeperCost}
                    </span>
                  </TableCell>
                  {!isFinalized && (
                    <TableCell className="py-4 text-center">
                      {item.isSelected ? (
                        <span className="text-sm text-muted-foreground">
                          Already selected
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelect(item.player.id)}
                          disabled={isLoading || !canSelectMore}
                          className="h-7 px-3 text-xs border-success/50 text-success hover:bg-success/10"
                        >
                          {isLoading ? "..." : "Select"}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {unselectedPlayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No available players match the current filters.
        </div>
      )}
    </div>
  );
}
