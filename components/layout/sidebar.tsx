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
  Trophy,
} from "lucide-react";

const navItems = [
  { label: "My Team", path: "/my-team", icon: Users },
  { label: "Keepers", path: "/my-team/keepers", icon: Star },
  { label: "Draft Board", path: "/draft-board", icon: LayoutGrid },
  { label: "Rules", path: "/rules", icon: BookOpen },
];

const adminItems = [
  { label: "Admin", path: "/admin/import", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isCommissioner = session?.user?.isCommissioner ?? false;

  const isActive = (path: string) => {
    if (path === "/my-team") {
      return pathname === "/my-team";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2 h-16 px-6 border-b border-border">
        <Trophy className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">
          KLeague
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin section - Commissioner only */}
        {isCommissioner && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Commissioner
              </div>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-border">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-foreground truncate">
            {session?.user?.name ?? "User"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session?.user?.email}
          </p>
        </div>
      </div>
    </aside>
  );
}
