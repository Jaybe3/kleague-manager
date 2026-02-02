"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface TeamOption {
  slotId: number;
  teamName: string;
}

interface TeamSelectorProps {
  teams: TeamOption[];
  currentSlotId: number;
  userSlotId: number | null;
  basePath?: string;
}

export function TeamSelector({
  teams,
  currentSlotId,
  userSlotId,
  basePath = "/my-team",
}: TeamSelectorProps) {
  const router = useRouter();

  const isViewingOther = userSlotId !== null && currentSlotId !== userSlotId;
  const currentTeam = teams.find((t) => t.slotId === currentSlotId);

  const handleTeamChange = (value: string) => {
    const selectedSlotId = parseInt(value, 10);

    // If selecting own team, remove slotId param
    if (selectedSlotId === userSlotId) {
      router.push(basePath);
    } else {
      // Navigate with slotId param
      router.push(`${basePath}?slotId=${selectedSlotId}`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isViewingOther && (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Eye className="w-3 h-3 mr-1" />
          Viewing as Commissioner
        </Badge>
      )}

      <Select
        value={String(currentSlotId)}
        onValueChange={handleTeamChange}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select team">
            {currentTeam?.teamName ?? `Slot ${currentSlotId}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.slotId} value={String(team.slotId)}>
              <span className="flex items-center gap-2">
                {team.teamName}
                {team.slotId === userSlotId && (
                  <span className="text-xs text-muted-foreground">(You)</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
