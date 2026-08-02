"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  Star,
  LayoutGrid,
  BookOpen,
  Settings,
  List,
} from "lucide-react";

const navItems = [
  { label: "Team", path: "/my-team", icon: Users },
  { label: "Keepers", path: "/my-team/keepers", icon: Star },
  { label: "Players", path: "/all-players", icon: List },
  { label: "Draft", path: "/draft-board", icon: LayoutGrid },
  { label: "Rules", path: "/rules", icon: BookOpen },
];

const adminItem = { label: "Admin", path: "/admin/import", icon: Settings };

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isCommissioner = session?.user?.isCommissioner ?? false;

  const isActive = (path: string) => {
    if (path === "/my-team") {
      return pathname === "/my-team";
    }
    return pathname.startsWith(path);
  };

  // Show 5 items for regular users, 6 for commissioners
  const items = isCommissioner ? [...navItems, adminItem] : navItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[11px] mt-1 font-medium whitespace-nowrap leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
