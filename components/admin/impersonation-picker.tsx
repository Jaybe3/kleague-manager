"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog } from "lucide-react";

interface UserRow {
  id: string;
  displayName: string;
  email: string;
  isCommissioner: boolean;
  slotIds: number[];
}

interface SlotOption {
  slotId: number;
  teamName: string;
}

const NO_SLOT = "none";

export function ImpersonationPicker() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const currentUserId = session?.user?.id;

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to load users");
    }
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => {
    (async () => {
      try {
        const slotsRes = await fetch("/api/slots");
        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setSlots(slotsData.slots || []);
        }
        await loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAssignSlot = async (user: UserRow, value: string) => {
    setSavingId(user.id);
    setError(null);
    try {
      let slotId: number | null;
      let managerId: string | null;
      if (value === NO_SLOT) {
        // Unassign the user's current slot (if any).
        if (user.slotIds.length === 0) {
          setSavingId(null);
          return;
        }
        slotId = user.slotIds[0];
        managerId = null;
      } else {
        slotId = parseInt(value, 10);
        managerId = user.id;
      }
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, managerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign slot");
      }
      // Reload so move-semantics (a slot changing hands) is reflected everywhere.
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign slot");
    } finally {
      setSavingId(null);
    }
  };

  const handleViewAs = async (targetUserId: string) => {
    setSwitchingId(targetUserId);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start viewing");
      }
      // Swap identity in the JWT (re-verified server-side), then land on
      // the impersonated user's home view.
      await update({ action: "impersonate", targetUserId });
      router.push("/my-team");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start viewing");
      setSwitchingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-md p-4">
        <p className="text-error/80">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <ul className="divide-y divide-border">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li
                key={u.id}
                className="flex flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {u.displayName}
                    </span>
                    {u.isCommissioner && (
                      <Badge variant="outline" className="text-xs">
                        Commissioner
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Select
                    value={u.slotIds.length > 0 ? String(u.slotIds[0]) : NO_SLOT}
                    onValueChange={(value) => handleAssignSlot(u, value)}
                    disabled={savingId !== null}
                  >
                    <SelectTrigger size="sm" className="flex-1 sm:flex-none sm:w-[190px]">
                      <SelectValue placeholder="No slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SLOT}>No slot</SelectItem>
                      {slots.map((s) => (
                        <SelectItem key={s.slotId} value={String(s.slotId)}>
                          Slot {s.slotId} — {s.teamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSelf || switchingId !== null}
                    onClick={() => handleViewAs(u.id)}
                  >
                    <UserCog className="w-4 h-4 mr-1" />
                    {isSelf
                      ? "You"
                      : switchingId === u.id
                        ? "Switching…"
                        : "View as"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
