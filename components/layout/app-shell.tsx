"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { ImpersonationBanner } from "./impersonation-banner";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation banner (only visible while viewing as another user) */}
      <ImpersonationBanner />

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="md:pl-64">
        <div className="p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
