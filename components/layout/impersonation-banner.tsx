"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [returning, setReturning] = useState(false);

  if (!session?.impersonating) {
    return null;
  }

  const viewingName = session.user?.name ?? "another manager";
  const realName = session.realUser?.name;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      await update({ action: "stopImpersonating" });
      router.push("/my-team");
      router.refresh();
    } catch {
      setReturning(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950">
      <div className="flex items-center justify-between gap-3 px-4 py-2 md:pl-64">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium truncate">
            Viewing as <span className="font-semibold">{viewingName}</span>
            {realName ? ` — signed in as ${realName}` : ""}
          </p>
        </div>
        <button
          onClick={handleReturn}
          disabled={returning}
          className="flex items-center gap-1 rounded-md bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1 text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          {returning ? "Returning…" : "Return to your account"}
        </button>
      </div>
    </div>
  );
}
