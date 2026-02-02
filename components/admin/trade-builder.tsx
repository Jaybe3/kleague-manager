"use client";

import { useState, useEffect } from "react";
import { PlayerSearch, PlayerSearchResult } from "./player-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, X, Users, Calendar } from "lucide-react";

interface TeamOption {
  slotId: number;
  teamName: string;
}

export interface TradeSide {
  slotId: number | null;
  teamName: string;
  players: PlayerSearchResult[];
}

export interface TradeData {
  teamA: TradeSide;
  teamB: TradeSide;
  tradeDate: string;
  seasonYear: number;
}

interface TradeBuilderProps {
  seasonYear: number;
  teams: TeamOption[];
  onPreview: (trade: TradeData) => void;
  loading?: boolean;
}

export function TradeBuilder({
  seasonYear,
  teams,
  onPreview,
  loading = false,
}: TradeBuilderProps) {
  const [teamA, setTeamA] = useState<TradeSide>({
    slotId: null,
    teamName: "",
    players: [],
  });

  const [teamB, setTeamB] = useState<TradeSide>({
    slotId: null,
    teamName: "",
    players: [],
  });

  const [tradeDate, setTradeDate] = useState(() => {
    // Default to today's date
    return new Date().toISOString().split("T")[0];
  });

  // Get available teams for each side (exclude the other side's selection)
  const teamsForA = teams.filter((t) => t.slotId !== teamB.slotId);
  const teamsForB = teams.filter((t) => t.slotId !== teamA.slotId);

  // Get all selected player IDs for exclusion
  const allSelectedPlayerIds = [
    ...teamA.players.map((p) => p.id),
    ...teamB.players.map((p) => p.id),
  ];

  const handleTeamAChange = (slotId: string) => {
    const slot = parseInt(slotId, 10);
    const team = teams.find((t) => t.slotId === slot);
    setTeamA({
      slotId: slot,
      teamName: team?.teamName || "",
      players: [], // Clear players when team changes
    });
  };

  const handleTeamBChange = (slotId: string) => {
    const slot = parseInt(slotId, 10);
    const team = teams.find((t) => t.slotId === slot);
    setTeamB({
      slotId: slot,
      teamName: team?.teamName || "",
      players: [], // Clear players when team changes
    });
  };

  const addPlayerToTeamA = (player: PlayerSearchResult) => {
    if (!teamA.players.find((p) => p.id === player.id)) {
      setTeamA((prev) => ({
        ...prev,
        players: [...prev.players, player],
      }));
    }
  };

  const addPlayerToTeamB = (player: PlayerSearchResult) => {
    if (!teamB.players.find((p) => p.id === player.id)) {
      setTeamB((prev) => ({
        ...prev,
        players: [...prev.players, player],
      }));
    }
  };

  const removePlayerFromTeamA = (playerId: string) => {
    setTeamA((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
  };

  const removePlayerFromTeamB = (playerId: string) => {
    setTeamB((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
  };

  const canPreview =
    teamA.slotId !== null &&
    teamB.slotId !== null &&
    teamA.players.length > 0 &&
    teamB.players.length > 0 &&
    tradeDate !== "";

  const handlePreview = () => {
    if (!canPreview) return;

    onPreview({
      teamA,
      teamB,
      tradeDate,
      seasonYear,
    });
  };

  const handleReset = () => {
    setTeamA({ slotId: null, teamName: "", players: [] });
    setTeamB({ slotId: null, teamName: "", players: [] });
    setTradeDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* Trade Date */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="trade-date">Trade Date</Label>
        </div>
        <Input
          id="trade-date"
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          className="w-auto"
        />
        <div className="text-sm text-muted-foreground">
          Season: {seasonYear}
        </div>
      </div>

      {/* Two-sided trade interface */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 items-start">
        {/* Team A Side */}
        <TradeSideCard
          title="Team A"
          side={teamA}
          teams={teamsForA}
          seasonYear={seasonYear}
          excludePlayerIds={allSelectedPlayerIds}
          onTeamChange={handleTeamAChange}
          onAddPlayer={addPlayerToTeamA}
          onRemovePlayer={removePlayerFromTeamA}
        />

        {/* Arrow indicator */}
        <div className="hidden lg:flex items-center justify-center h-full pt-20">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Mobile arrow */}
        <div className="lg:hidden flex justify-center py-2">
          <ArrowLeftRight className="h-6 w-6 text-muted-foreground rotate-90" />
        </div>

        {/* Team B Side */}
        <TradeSideCard
          title="Team B"
          side={teamB}
          teams={teamsForB}
          seasonYear={seasonYear}
          excludePlayerIds={allSelectedPlayerIds}
          onTeamChange={handleTeamBChange}
          onAddPlayer={addPlayerToTeamB}
          onRemovePlayer={removePlayerFromTeamB}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleReset} disabled={loading}>
          Reset
        </Button>

        <div className="flex items-center gap-2">
          {!canPreview && (
            <span className="text-sm text-muted-foreground">
              Select teams and add players to both sides
            </span>
          )}
          <Button onClick={handlePreview} disabled={!canPreview || loading}>
            {loading ? "Processing..." : "Preview Trade"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============= Trade Side Card =============

interface TradeSideCardProps {
  title: string;
  side: TradeSide;
  teams: TeamOption[];
  seasonYear: number;
  excludePlayerIds: string[];
  onTeamChange: (slotId: string) => void;
  onAddPlayer: (player: PlayerSearchResult) => void;
  onRemovePlayer: (playerId: string) => void;
}

function TradeSideCard({
  title,
  side,
  teams,
  seasonYear,
  excludePlayerIds,
  onTeamChange,
  onAddPlayer,
  onRemovePlayer,
}: TradeSideCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Selector */}
        <div className="space-y-2">
          <Label>Select Team</Label>
          <Select
            value={side.slotId ? String(side.slotId) : ""}
            onValueChange={onTeamChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a team...">
                {side.teamName || "Choose a team..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.slotId} value={String(team.slotId)}>
                  {team.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player Search */}
        <div className="space-y-2">
          <Label>Add Players</Label>
          <PlayerSearch
            slotId={side.slotId}
            seasonYear={seasonYear}
            onSelect={onAddPlayer}
            excludePlayerIds={excludePlayerIds}
            placeholder={
              side.slotId ? "Search players to add..." : "Select a team first"
            }
          />
        </div>

        {/* Selected Players List */}
        <div className="space-y-2">
          <Label>
            Players in Trade ({side.players.length})
          </Label>
          {side.players.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md text-center">
              No players added yet
            </div>
          ) : (
            <ul className="space-y-2">
              {side.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {player.firstName} {player.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.acquisitionType === "DRAFT" && player.draftRound
                          ? `Drafted R${player.draftRound}`
                          : player.acquisitionType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {player.position}
                    </Badge>
                    {player.isKeeperEligible && player.keeperCost && (
                      <Badge variant="secondary" className="text-xs">
                        R{player.keeperCost}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePlayer(player.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
