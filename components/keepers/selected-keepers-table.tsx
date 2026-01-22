"use client";

import { useState } from "react";
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

interface SelectedKeepersTableProps {
  selections: KeeperSelectionInfo[];
  totalRounds: number;
  isFinalized: boolean;
  onRemove: (playerId: string) => Promise<void>;
  onBump: (playerId: string, newRound: number) => Promise<void>;
  getBumpOptions: (playerId: string) => Promise<number[]>;
}

export function SelectedKeepersTable({
  selections,
  totalRounds,
  isFinalized,
  onRemove,
  onBump,
  getBumpOptions,
}: SelectedKeepersTableProps) {
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);
  const [bumpOptionsPlayerId, setBumpOptionsPlayerId] = useState<string | null>(null);
  const [bumpOptions, setBumpOptions] = useState<number[]>([]);

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
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead className="py-3">Player</TableHead>
              <TableHead className="py-3">Pos</TableHead>
              <TableHead className="text-center py-3">Calculated Cost</TableHead>
              <TableHead className="text-center py-3">Final Round</TableHead>
              {!isFinalized && (
                <TableHead className="text-center py-3">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selections.map((selection) => {
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
                          className="h-7 px-2 text-xs border-primary/50 text-primary hover:bg-primary/10"
                        >
                          {showBumpOptions ? "Cancel" : "Bump"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(selection.player.id)}
                          disabled={isLoading}
                          className="h-7 px-2 text-xs border-error/50 text-error hover:bg-error/10"
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
                                  className="h-6 px-2 text-xs"
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
      <div className="text-sm text-muted-foreground">
        {selections.length} keeper{selections.length !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}
