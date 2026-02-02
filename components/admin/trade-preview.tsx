"use client";

import { TradeData } from "./trade-builder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Calendar, Check, X } from "lucide-react";

interface TradePreviewProps {
  trade: TradeData;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TradePreview({
  trade,
  onConfirm,
  onCancel,
  loading = false,
}: TradePreviewProps) {
  const formattedDate = new Date(trade.tradeDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          Trade Preview
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trade Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Trade Date: {formattedDate}</span>
          <span className="text-muted-foreground/60">
            (Season {trade.seasonYear})
          </span>
        </div>

        {/* Trade Summary */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
          {/* Team A sends */}
          <div className="space-y-3">
            <div className="font-semibold text-lg">{trade.teamA.teamName}</div>
            <div className="text-sm text-muted-foreground">Sends:</div>
            <ul className="space-y-2">
              {trade.teamA.players.map((player) => (
                <li
                  key={player.id}
                  className="p-3 bg-destructive/5 border border-destructive/20 rounded-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {player.firstName} {player.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.acquisitionType === "DRAFT" && player.draftRound
                          ? `Originally drafted R${player.draftRound}`
                          : player.acquisitionType}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{player.position}</Badge>
                      {player.isKeeperEligible && player.keeperCost && (
                        <Badge variant="secondary">R{player.keeperCost}</Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center pt-12">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Mobile arrow */}
          <div className="md:hidden flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Team B receives / sends */}
          <div className="space-y-3">
            <div className="font-semibold text-lg">{trade.teamB.teamName}</div>
            <div className="text-sm text-muted-foreground">Sends:</div>
            <ul className="space-y-2">
              {trade.teamB.players.map((player) => (
                <li
                  key={player.id}
                  className="p-3 bg-success/5 border border-success/20 rounded-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {player.firstName} {player.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.acquisitionType === "DRAFT" && player.draftRound
                          ? `Originally drafted R${player.draftRound}`
                          : player.acquisitionType}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{player.position}</Badge>
                      {player.isKeeperEligible && player.keeperCost && (
                        <Badge variant="secondary">R{player.keeperCost}</Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Summary counts */}
        <div className="flex items-center justify-center gap-4 py-2 text-sm text-muted-foreground border-t border-b">
          <span>
            {trade.teamA.teamName} sends {trade.teamA.players.length} player
            {trade.teamA.players.length !== 1 ? "s" : ""}
          </span>
          <ArrowRight className="h-4 w-4" />
          <span>
            {trade.teamB.teamName} sends {trade.teamB.players.length} player
            {trade.teamB.players.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-md">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-warning">
              This action cannot be undone
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Recording this trade will update player acquisitions and affect
              keeper eligibility calculations. Please verify the details above
              are correct.
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className="bg-primary"
        >
          {loading ? (
            "Recording Trade..."
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm Trade
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
