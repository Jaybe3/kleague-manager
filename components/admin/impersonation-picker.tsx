"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";

interface UserRow {
  id: string;
  displayName: string;
  email: string;
  isCommissioner: boolean;
  slotIds: number[];
}

export function ImpersonationPicker() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const currentUserId = session?.user?.id;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load users");
        }
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
                className="flex items-center justify-between gap-4 py-3"
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
                    {u.slotIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Slot {u.slotIds.join(", ")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {u.email}
                  </p>
                </div>
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
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
