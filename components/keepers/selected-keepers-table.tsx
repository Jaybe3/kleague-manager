"use client";

import { useState, useMemo } from "react";
import { KeeperSelectionInfo } from "@/lib/keeper/selection-types";
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
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { MobileSort } from "@/components/players/mobile-sort";

type SortField = "name" | "position" | "calculatedRound" | "finalRound";
type SortDirection = "asc" | "desc";

const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

interface SelectedKeepersTableProps {
  selections: KeeperSelectionInfo[];
  totalRounds: number;
  isFinalized: boolean;
  onRemove: (playerId: string) => Promise<void>;
  onBump: (playerId: string, newRound: number) => Promise<void>;
  onResetBump: (playerId: string) => Promise<void>;
  getBumpOptions: (playerId: string) => Promise<number[]>;
}

export function SelectedKeepersTable({
  selections,
  totalRounds,
  isFinalized,
  onRemove,
  onBump,
  onResetBump,
  getBumpOptions,
}: SelectedKeepersTableProps) {
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);
  const [bumpOptionsPlayerId, setBumpOptionsPlayerId] = useState<string | null>(null);
  const [bumpOptions, setBumpOptions] = useState<number[]>([]);
  const [sortField, setSortField] = useState<SortField>("finalRound");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedSelections = useMemo(() => {
    return [...selections].sort((a, b) => {
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
        case "calculatedRound":
          comparison = a.calculatedRound - b.calculatedRound;
          break;
        case "finalRound":
          comparison = a.finalRound - b.finalRound;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [selections, sortField, sortDirection]);

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

  const handleRemove = async (playerId: string) => {
    setLoadingPlayerId(playerId);
    try {
      await onRemove(playerId);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  const handleShowBumpOptions = async (playerId: string) => {
    if (bumpOptionsPlayerId === playerId) {
      setBumpOptionsPlayerId(null);
      setBumpOptions([]);
      return;
    }

    setLoadingPlayerId(playerId);
    try {
      const options = await getBumpOptions(playerId);
      setBumpOptions(options);
      setBumpOptionsPlayerId(playerId);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  const handleBump = async (playerId: string, newRound: number) => {
    setLoadingPlayerId(playerId);
    try {
      await onBump(playerId, newRound);
      setBumpOptionsPlayerId(null);
      setBumpOptions([]);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  const handleResetBump = async (playerId: string) => {
    setLoadingPlayerId(playerId);
    try {
      await onResetBump(playerId);
      setBumpOptionsPlayerId(null);
      setBumpOptions([]);
    } finally {
      setLoadingPlayerId(null);
    }
  };

  if (selections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-md">
        <p>No keepers selected yet.</p>
        <p className="text-sm mt-1">
          Select players from your eligible players below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden md:block rounded-md border border-border overflow-hidden">
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
                onClick={() => handleSort("calculatedRound")}
              >
                Calculated Cost
                <SortIndicator field="calculatedRound" />
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:text-foreground transition-colors py-3"
                onClick={() => handleSort("finalRound")}
              >
                Final Round
                <SortIndicator field="finalRound" />
              </TableHead>
              {!isFinalized && (
                <TableHead className="text-center py-3">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSelections.map((selection) => {
              const isLoading = loadingPlayerId === selection.player.id;
              const showBumpOptions = bumpOptionsPlayerId === selection.player.id;

              return (
                <TableRow
                  key={selection.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                    selection.isBumped ? "bg-warning/5" : ""
                  }`}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {selection.player.firstName} {selection.player.lastName}
                      </span>
                      {selection.isBumped && (
                        <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 text-xs">
                          Bumped
                        </Badge>
                      )}
                      {selection.isFinalized && (
                        <Badge className="bg-success/20 text-success hover:bg-success/30 border-0 text-xs">
                          Finalized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {selection.player.position}
                  </TableCell>
                  <TableCell className="py-4 text-center text-muted-foreground">
                    Round {selection.calculatedRound}
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <span
                      className={`font-semibold ${
                        selection.isBumped
                          ? "text-warning"
                          : "text-foreground"
                      }`}
                    >
                      Round {selection.finalRound}
                    </span>
                  </TableCell>
                  {!isFinalized && (
                    <TableCell className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowBumpOptions(selection.player.id)}
                          disabled={isLoading}
                          className="h-9 md:h-7 px-2 text-xs border-primary/50 text-primary hover:bg-primary/10"
                        >
                          {showBumpOptions ? "Cancel" : "Bump"}
                        </Button>
                        {selection.isBumped && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetBump(selection.player.id)}
                            disabled={isLoading}
                            className="h-9 md:h-7 px-2 text-xs border-warning/50 text-warning hover:bg-warning/10"
                            title={`Reset to original Round ${selection.calculatedRound}`}
                          >
                            Reset
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(selection.player.id)}
                          disabled={isLoading}
                          className="h-9 md:h-7 px-2 text-xs border-error/50 text-error hover:bg-error/10"
                        >
                          Remove
                        </Button>
                      </div>
                      {showBumpOptions && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          {bumpOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              <span className="text-xs text-muted-foreground w-full mb-1">
                                Bump to round:
                              </span>
                              {bumpOptions.map((round) => (
                                <Button
                                  key={round}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBump(selection.player.id, round)}
                                  disabled={isLoading}
                                  className="h-8 md:h-6 px-2 text-xs"
                                >
                                  R{round}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No earlier rounds available
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cards (mobile) */}
      <MobileSort
        value={sortField}
        direction={sortDirection}
        onFieldChange={(v) => setSortField(v as SortField)}
        onToggleDirection={() =>
          setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
        }
        options={[
          { value: "finalRound", label: "Final round" },
          { value: "calculatedRound", label: "Calculated cost" },
          { value: "name", label: "Name" },
          { value: "position", label: "Position" },
        ]}
      />
      <div className="md:hidden space-y-3">
        {sortedSelections.map((selection) => {
          const isLoading = loadingPlayerId === selection.player.id;
          const showBumpOptions = bumpOptionsPlayerId === selection.player.id;

          return (
            <div
              key={selection.id}
              className={`rounded-lg border border-border border-l-4 bg-card p-4 ${
                selection.isBumped ? "border-l-warning" : "border-l-success"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-muted-foreground">
                    {selection.player.position}
                  </span>
                  <h3 className="truncate text-[15px] font-semibold text-foreground">
                    {selection.player.firstName} {selection.player.lastName}
                  </h3>
                </div>
                <span className="shrink-0 font-mono text-sm text-primary tabular-nums">
                  R{selection.finalRound}
                </span>
              </div>
              <div
                className={`mb-3 flex items-center gap-2 text-[13px] ${
                  selection.isBumped ? "text-warning" : "text-primary"
                }`}
              >
                {selection.isBumped ? (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Bumped · Round cost increased</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      {selection.isFinalized
                        ? "Selected · Finalized"
                        : "Selected · Standard keeper"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Calculated R{selection.calculatedRound}
                </span>
                {!isFinalized && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleShowBumpOptions(selection.player.id)}
                      disabled={isLoading}
                      className="rounded-md border border-border bg-muted/30 px-3 py-1 text-[11px] font-bold text-foreground active:scale-95 disabled:opacity-50"
                    >
                      {showBumpOptions ? "CANCEL" : "BUMP"}
                    </button>
                    {selection.isBumped && (
                      <button
                        type="button"
                        onClick={() => handleResetBump(selection.player.id)}
                        disabled={isLoading}
                        title={`Reset to original Round ${selection.calculatedRound}`}
                        className="rounded-md bg-warning/10 px-3 py-1 text-[11px] font-bold text-warning active:scale-95 disabled:opacity-50"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(selection.player.id)}
                      disabled={isLoading}
                      className="rounded-md bg-error/10 px-3 py-1 text-[11px] font-bold text-error active:scale-95 disabled:opacity-50"
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
              {showBumpOptions && !isFinalized && (
                <div className="mt-2 rounded-md bg-muted/50 p-2">
                  {bumpOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      <span className="mb-1 w-full text-xs text-muted-foreground">
                        Bump to round:
                      </span>
                      {bumpOptions.map((round) => (
                        <button
                          key={round}
                          type="button"
                          onClick={() => handleBump(selection.player.id, round)}
                          disabled={isLoading}
                          className="rounded-md border border-border px-3 py-1 text-xs text-foreground active:scale-95 disabled:opacity-50"
                        >
                          R{round}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No earlier rounds available
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {selections.length} keeper{selections.length !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}
